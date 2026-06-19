import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { JsonSchema } from "./ai.schemas";

interface OpenAIOutputContent {
  type: string;
  text?: string;
  refusal?: string;
}

interface OpenAIResponse {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  error?: { code?: string; message?: string } | null;
  output?: Array<{
    type?: string;
    content?: OpenAIOutputContent[];
  }>;
}

export class AiClient {
  static async generateStructured<T>(input: {
    schemaName: string;
    schema: JsonSchema;
    instructions: string;
    prompt: string;
    maxOutputTokens: number;
  }): Promise<T> {
    if (!env.AI_API_KEY) {
      throw new AppError(503, "AI assistant is not configured.", "AI_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          reasoning: { effort: "minimal" },
          instructions: input.instructions,
          input: input.prompt,
          max_output_tokens: input.maxOutputTokens,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: input.schemaName,
              strict: true,
              schema: input.schema,
            },
          },
        }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

      if (!response.ok) {
        const isRateLimit = response.status === 429;
        throw new AppError(
          isRateLimit ? 429 : 502,
          isRateLimit
            ? "AI assistant rate limit exceeded."
            : "AI assistant request failed.",
          isRateLimit ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR",
          { providerStatus: response.status, providerCode: payload.error?.code }
        );
      }

      if (payload.status === "incomplete") {
        throw new AppError(
          502,
          "AI assistant returned an incomplete suggestion.",
          "AI_INCOMPLETE_RESPONSE",
          { reason: payload.incomplete_details?.reason }
        );
      }

      const content = payload.output
        ?.find((item) => item.type === "message")
        ?.content?.find((item) => item.type === "output_text" || item.type === "refusal");

      if (content?.type === "refusal") {
        throw new AppError(
          422,
          "AI assistant could not generate this suggestion.",
          "AI_REFUSED_REQUEST"
        );
      }

      if (!content?.text) {
        throw new AppError(502, "AI assistant returned no suggestion.", "AI_EMPTY_RESPONSE");
      }

      try {
        return JSON.parse(content.text) as T;
      } catch {
        throw new AppError(
          502,
          "AI assistant returned an invalid structured response.",
          "AI_INVALID_RESPONSE"
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(504, "AI assistant request timed out.", "AI_TIMEOUT");
      }

      throw new AppError(502, "AI assistant is temporarily unavailable.", "AI_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }
}
