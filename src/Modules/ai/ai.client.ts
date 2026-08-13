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
  usage?: {
    input_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: Array<{
    type?: string;
    content?: OpenAIOutputContent[];
  }>;
}

export interface AiProviderUsage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AiProviderStructuredResult<T> {
  data: T;
  provider: "openai";
  model: string;
  usage?: AiProviderUsage;
}

export interface AiProviderImageResult {
  data: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  provider: "openai";
  model: string;
  usage?: AiProviderUsage;
}

export class AiClient {
  static async generateImage(input: { prompt: string; model: string }): Promise<AiProviderImageResult> {
    if (!env.AI_API_KEY) {
      throw new AppError(503, "A geracao de imagem nao esta configurada.", "AI_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          prompt: input.prompt,
          n: 1,
          size: "1024x1536",
          quality: "medium",
          output_format: "webp",
          output_compression: 88,
          background: "opaque",
          moderation: "auto",
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: { code?: string };
        data?: Array<{ b64_json?: string }>;
        output_format?: "png" | "jpeg" | "webp";
        usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
      };
      if (!response.ok) {
        throw new AppError(
          response.status === 429 ? 429 : 502,
          response.status === 429
            ? "O limite temporario de geracao de imagens foi atingido. Tente novamente mais tarde."
            : "Nao foi possivel gerar a imagem agora.",
          response.status === 429 ? "AI_RATE_LIMITED" : "AI_IMAGE_PROVIDER_ERROR",
          { providerStatus: response.status, providerCode: payload.error?.code }
        );
      }
      const encoded = payload.data?.[0]?.b64_json;
      if (!encoded) {
        throw new AppError(502, "O provedor nao retornou a imagem.", "AI_EMPTY_IMAGE_RESPONSE");
      }
      const format = payload.output_format ?? "webp";
      return {
        data: Buffer.from(encoded, "base64"),
        mimeType: format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp",
        provider: "openai",
        model: input.model,
        usage: {
          inputTokens: payload.usage?.input_tokens,
          outputTokens: payload.usage?.output_tokens,
          totalTokens: payload.usage?.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(504, "A geracao da imagem demorou demais. Tente novamente.", "AI_IMAGE_TIMEOUT");
      }
      throw new AppError(502, "A geracao de imagem esta temporariamente indisponivel.", "AI_IMAGE_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  static async generateStructured<T>(input: {
    schemaName: string;
    schema: JsonSchema;
    instructions: string;
    prompt: string;
    maxOutputTokens: number;
  }): Promise<T> {
    const result = await this.generateStructuredWithUsage<T>(input);
    return result.data;
  }

  static async generateStructuredWithUsage<T>(input: {
    schemaName: string;
    schema: JsonSchema;
    instructions: string;
    prompt: string;
    maxOutputTokens: number;
  }): Promise<AiProviderStructuredResult<T>> {
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
        return {
          data: JSON.parse(content.text) as T,
          provider: "openai",
          model: env.AI_MODEL,
          usage: {
            inputTokens: payload.usage?.input_tokens,
            cachedInputTokens: payload.usage?.input_tokens_details?.cached_tokens,
            outputTokens: payload.usage?.output_tokens,
            totalTokens: payload.usage?.total_tokens,
          },
        };
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
