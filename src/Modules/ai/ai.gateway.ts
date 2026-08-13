import { AiPricingModality, AiUsageStatus } from "@prisma/client";
import crypto from "crypto";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { JsonSchema } from "./ai.schemas";
import { AiClient, AiProviderUsage } from "./ai.client";
import { AiPricingService } from "./ai.pricing.service";

type AiGatewayDb = typeof defaultPrisma;

export type AiGatewayUseCase =
  | "WORLD_SUMMARY"
  | "MISSION_IDEAS"
  | "TRAIT_SUGGESTIONS"
  | "TIMELINE_SUMMARY"
  | "PLAYER_CHARACTER_CREATION"
  | "PLAYER_CHARACTER_VALIDATION"
  | "CHARACTER_CHAPTER_SUGGESTION"
  | "CHARACTER_FIELD_REFINEMENT"
  | "CHARACTER_CARD_ART_PROMPT"
  | "CHARACTER_CARD_ART_GENERATION";

export interface AiGatewayRequest<T> {
  requestId?: string;
  useCase: AiGatewayUseCase;
  userId?: string;
  tableId?: string;
  characterId?: string;
  suggestionId?: string;
  contextVersionId?: string;
  promptVersion: string;
  schemaName: string;
  schema: JsonSchema;
  instructions: string;
  prompt: string;
  maxOutputTokens: number;
  imageCount?: number;
}

export interface AiGatewayResult<T> {
  data: T;
  requestId: string;
  provider: string;
  model: string;
  usage?: AiProviderUsage;
  usageEventId?: string;
}

export class AiGateway {
  private static db: AiGatewayDb = defaultPrisma;

  static setDbForTests(db: AiGatewayDb): void {
    this.db = db;
    AiPricingService.setDbForTests(db);
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
    AiPricingService.resetDbForTests();
  }

  static async generateStructured<T>(input: AiGatewayRequest<T>): Promise<AiGatewayResult<T>> {
    const requestId = input.requestId ?? crypto.randomUUID();
    const started = Date.now();
    let provider = "openai";
    let model = process.env.AI_MODEL ?? "gpt-5-nano";

    try {
      const response = await AiClient.generateStructuredWithUsage<T>({
        schemaName: input.schemaName,
        schema: input.schema,
        instructions: input.instructions,
        prompt: input.prompt,
        maxOutputTokens: input.maxOutputTokens,
      });
      provider = response.provider;
      model = response.model;
      const event = await this.recordUsage({
        ...input,
        requestId,
        provider,
        model,
        latencyMs: Date.now() - started,
        status: AiUsageStatus.SUCCESS,
        usage: response.usage,
      });

      return {
        data: response.data,
        requestId,
        provider,
        model,
        usage: response.usage,
        usageEventId: event.id,
      };
    } catch (error) {
      await this.recordUsage({
        ...input,
        requestId,
        provider,
        model,
        latencyMs: Date.now() - started,
        status: AiUsageStatus.ERROR,
        errorCode: error instanceof AppError ? error.code : "AI_REQUEST_FAILED",
      }).catch(() => undefined);
      throw error;
    }
  }

  static async recordInternalEvent(input: {
    requestId?: string;
    useCase: AiGatewayUseCase;
    userId?: string;
    tableId?: string;
    characterId?: string;
    contextVersionId?: string;
    promptVersion: string;
    provider: string;
    model: string;
    latencyMs?: number;
    status?: AiUsageStatus;
    errorCode?: string;
    imageCount?: number;
  }) {
    return this.recordUsage({
      requestId: input.requestId ?? crypto.randomUUID(),
      useCase: input.useCase,
      userId: input.userId,
      tableId: input.tableId,
      characterId: input.characterId,
      contextVersionId: input.contextVersionId,
      promptVersion: input.promptVersion,
      provider: input.provider,
      model: input.model,
      latencyMs: input.latencyMs ?? 0,
      status: input.status ?? AiUsageStatus.SUCCESS,
      errorCode: input.errorCode,
      imageCount: input.imageCount,
      schemaName: "internal_event",
      schema: {},
      instructions: "",
      prompt: "",
      maxOutputTokens: 0,
    });
  }

  private static async recordUsage(input: AiGatewayRequest<unknown> & {
    requestId: string;
    provider: string;
    model: string;
    latencyMs: number;
    status: AiUsageStatus;
    usage?: AiProviderUsage;
    errorCode?: string;
  }) {
    const cost = await AiPricingService.calculateCost({
      provider: input.provider,
      model: input.model,
      modality: input.imageCount ? AiPricingModality.IMAGE : AiPricingModality.TEXT,
      usage: {
        inputTokens: input.usage?.inputTokens,
        cachedInputTokens: input.usage?.cachedInputTokens,
        outputTokens: input.usage?.outputTokens,
        imageCount: input.imageCount,
      },
    });

    return this.db.aiUsageEvent.upsert({
      where: { requestId: input.requestId },
      create: {
        requestId: input.requestId,
        userId: input.userId ?? null,
        tableId: input.tableId ?? null,
        characterId: input.characterId ?? null,
        suggestionId: input.suggestionId ?? null,
        useCase: input.useCase,
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
        contextVersionId: input.contextVersionId ?? null,
        inputTokens: input.usage?.inputTokens ?? null,
        cachedInputTokens: input.usage?.cachedInputTokens ?? null,
        outputTokens: input.usage?.outputTokens ?? null,
        totalTokens: input.usage?.totalTokens ?? null,
        imageCount: input.imageCount ?? null,
        latencyMs: input.latencyMs,
        status: input.status,
        errorCode: input.errorCode ?? null,
        pricingVersion: cost.pricingVersion ?? null,
        costMicrosUsd: cost.costMicrosUsd ?? null,
        costSource: cost.costSource,
      },
      update: {},
    });
  }
}
