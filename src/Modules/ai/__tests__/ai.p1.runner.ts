import assert from "assert";
import { AiCostSource, AiPricingModality } from "@prisma/client";
import { AiGateway } from "../ai.gateway";
import { AiClient } from "../ai.client";
import { AiPricingService } from "../ai.pricing.service";
import { AppError } from "../../../errors/AppError";

type TestFn = () => void | Promise<void>;

const test = async (name: string, fn: TestFn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
};

const createDb = (price: any = null) => {
  const usageEvents: any[] = [];
  return {
    usageEvents,
    aiPricing: {
      findFirst: async () => price,
    },
    aiUsageEvent: {
      upsert: async ({ where, create }: any) => {
        const existing = usageEvents.find((event) => event.requestId === where.requestId);
        if (existing) {
          return existing;
        }
        const event = { id: `usage-${usageEvents.length + 1}`, ...create };
        usageEvents.push(event);
        return event;
      },
    },
  };
};

const originalGenerate = AiClient.generateStructuredWithUsage;

void (async () => {
  await test("calculo de custo considera entrada cache saida e imagem", async () => {
    const db = createDb({
      version: "test-price-v1",
      inputMicrosUsdPerMillion: BigInt(100),
      cachedInputMicrosUsdPerMillion: BigInt(25),
      outputMicrosUsdPerMillion: BigInt(200),
      imageMicrosUsd: BigInt(5000),
    });
    AiPricingService.setDbForTests(db as any);

    const text = await AiPricingService.calculateCost({
      provider: "openai",
      model: "test-model",
      modality: AiPricingModality.TEXT,
      usage: { inputTokens: 1_000_000, cachedInputTokens: 250_000, outputTokens: 500_000 },
    });
    assert.equal(text.costSource, AiCostSource.CONFIGURED_PRICE);
    assert.equal(text.costMicrosUsd?.toString(), "181");

    const image = await AiPricingService.calculateCost({
      provider: "openai",
      model: "test-model",
      modality: AiPricingModality.IMAGE,
      usage: { imageCount: 2 },
    });
    assert.equal(image.costMicrosUsd?.toString(), "10000");
  });

  await test("chamada sem preco permanece sem custo calculado", async () => {
    AiPricingService.setDbForTests(createDb(null) as any);
    const cost = await AiPricingService.calculateCost({
      provider: "openai",
      model: "unpriced",
      modality: AiPricingModality.TEXT,
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    assert.equal(cost.costSource, AiCostSource.UNPRICED);
    assert.equal(cost.costMicrosUsd, undefined);
  });

  await test("AiUsageEvent registra sucesso falha e requestId impede dupla contabilizacao", async () => {
    const db = createDb({
      version: "test-price-v1",
      inputMicrosUsdPerMillion: BigInt(100),
      cachedInputMicrosUsdPerMillion: BigInt(25),
      outputMicrosUsdPerMillion: BigInt(200),
      imageMicrosUsd: null,
    });
    AiGateway.setDbForTests(db as any);

    (AiClient.generateStructuredWithUsage as any) = async () => ({
      data: { ok: true },
      provider: "openai",
      model: "test-model",
      usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 5, totalTokens: 15 },
    });

    await AiGateway.generateStructured({
      requestId: "same-request",
      useCase: "CHARACTER_CHAPTER_SUGGESTION",
      userId: "user-a",
      tableId: "table-a",
      characterId: "character-a",
      promptVersion: "test-v1",
      schemaName: "test",
      schema: {},
      instructions: "test",
      prompt: "test",
      maxOutputTokens: 10,
    });
    await AiGateway.generateStructured({
      requestId: "same-request",
      useCase: "CHARACTER_CHAPTER_SUGGESTION",
      promptVersion: "test-v1",
      schemaName: "test",
      schema: {},
      instructions: "test",
      prompt: "test",
      maxOutputTokens: 10,
    });
    assert.equal(db.usageEvents.length, 1);
    assert.equal(db.usageEvents[0].status, "SUCCESS");

    (AiClient.generateStructuredWithUsage as any) = async () => {
      throw new AppError(502, "falha", "AI_PROVIDER_ERROR");
    };
    await assert.rejects(
      () =>
        AiGateway.generateStructured({
          requestId: "failed-request",
          useCase: "CHARACTER_CHAPTER_SUGGESTION",
          promptVersion: "test-v1",
          schemaName: "test",
          schema: {},
          instructions: "test",
          prompt: "test",
          maxOutputTokens: 10,
        }),
      AppError
    );
    assert.equal(db.usageEvents.length, 2);
    assert.equal(db.usageEvents[1].status, "ERROR");
    assert.equal(db.usageEvents[1].errorCode, "AI_PROVIDER_ERROR");
  });

  AiClient.generateStructuredWithUsage = originalGenerate;
  AiGateway.resetDbForTests();
  AiPricingService.resetDbForTests();

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log("AI P1 tests completed.");
})();
