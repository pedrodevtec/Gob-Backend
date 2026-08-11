import { AiCostSource, AiPricingModality } from "@prisma/client";
import defaultPrisma from "../../config/db";

type AiPricingDb = typeof defaultPrisma;

export interface AiUsageForCost {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
}

export interface AiCostResult {
  pricingVersion?: string;
  costMicrosUsd?: bigint;
  costSource: AiCostSource;
}

const perMillion = (units: number, microsPerMillion: bigint): bigint =>
  (BigInt(units) * microsPerMillion) / BigInt(1_000_000);

export class AiPricingService {
  private static db: AiPricingDb = defaultPrisma;

  static setDbForTests(db: AiPricingDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async calculateCost(input: {
    provider: string;
    model: string;
    modality: AiPricingModality;
    usage: AiUsageForCost;
    at?: Date;
  }): Promise<AiCostResult> {
    const hasTextUsage =
      input.usage.inputTokens !== undefined ||
      input.usage.cachedInputTokens !== undefined ||
      input.usage.outputTokens !== undefined;
    const hasImageUsage = input.usage.imageCount !== undefined;

    if (input.modality === AiPricingModality.TEXT && !hasTextUsage) {
      return { costSource: AiCostSource.USAGE_UNAVAILABLE };
    }
    if (input.modality === AiPricingModality.IMAGE && !hasImageUsage) {
      return { costSource: AiCostSource.USAGE_UNAVAILABLE };
    }

    const price = await this.db.aiPricing.findFirst({
      where: {
        provider: input.provider,
        model: input.model,
        modality: input.modality,
        currency: "USD",
        effectiveFrom: { lte: input.at ?? new Date() },
      },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    });

    if (!price) {
      return { costSource: AiCostSource.UNPRICED };
    }

    let total = BigInt(0);
    if (input.modality === AiPricingModality.TEXT) {
      const cached = input.usage.cachedInputTokens ?? 0;
      const inputTokens = Math.max(0, (input.usage.inputTokens ?? 0) - cached);
      const outputTokens = input.usage.outputTokens ?? 0;

      if (price.inputMicrosUsdPerMillion !== null) {
        total += perMillion(inputTokens, price.inputMicrosUsdPerMillion);
      }
      if (price.cachedInputMicrosUsdPerMillion !== null) {
        total += perMillion(cached, price.cachedInputMicrosUsdPerMillion);
      } else if (price.inputMicrosUsdPerMillion !== null) {
        total += perMillion(cached, price.inputMicrosUsdPerMillion);
      }
      if (price.outputMicrosUsdPerMillion !== null) {
        total += perMillion(outputTokens, price.outputMicrosUsdPerMillion);
      }
    } else if (price.imageMicrosUsd !== null) {
      total += BigInt(input.usage.imageCount ?? 0) * price.imageMicrosUsd;
    }

    return {
      pricingVersion: price.version,
      costMicrosUsd: total,
      costSource: AiCostSource.CONFIGURED_PRICE,
    };
  }
}
