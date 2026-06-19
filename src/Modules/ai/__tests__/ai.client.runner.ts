import assert from "node:assert/strict";
import { env } from "../../../config/env";
import { AppError } from "../../../errors/AppError";
import { AiClient } from "../ai.client";

const test = async (name: string, run: () => Promise<void>): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const originalApiKey = env.AI_API_KEY;
const originalFetch = global.fetch;

void (async () => {
  await test("retorna erro claro quando a chave de IA nao esta configurada", async () => {
    env.AI_API_KEY = "";

    await assert.rejects(
      () =>
        AiClient.generateStructured({
          schemaName: "test",
          schema: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
            additionalProperties: false,
          },
          instructions: "Teste",
          prompt: "Teste",
          maxOutputTokens: 20,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "AI_NOT_CONFIGURED" &&
        error.message === "AI assistant is not configured."
    );
  });

  await test("envia structured output sem persistir a resposta no provedor", async () => {
    env.AI_API_KEY = "test-key";
    let requestBody: Record<string, unknown> | undefined;

    global.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "{\"value\":\"ok\"}" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const result = await AiClient.generateStructured<{ value: string }>({
      schemaName: "test",
      schema: {
        type: "object",
        properties: { value: { type: "string" } },
        required: ["value"],
        additionalProperties: false,
      },
      instructions: "Teste",
      prompt: "Teste",
      maxOutputTokens: 20,
    });

    assert.deepEqual(result, { value: "ok" });
    assert.equal(requestBody?.store, false);
    assert.equal(requestBody?.max_output_tokens, 20);
    assert.equal(requestBody?.model, "gpt-5-nano");
    assert.deepEqual(requestBody?.reasoning, { effort: "minimal" });
  });

  console.log("AI client tests completed.");
})()
  .finally(() => {
    env.AI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
