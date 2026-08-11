CREATE TYPE "AiUseCase" AS ENUM (
  'WORLD_SUMMARY',
  'MISSION_IDEAS',
  'TRAIT_SUGGESTIONS',
  'TIMELINE_SUMMARY',
  'PLAYER_CHARACTER_CREATION',
  'PLAYER_CHARACTER_VALIDATION',
  'CHARACTER_CHAPTER_SUGGESTION',
  'CHARACTER_FIELD_REFINEMENT',
  'CHARACTER_CARD_ART_PROMPT'
);

CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCESS', 'ERROR');

CREATE TYPE "AiPricingModality" AS ENUM ('TEXT', 'IMAGE');

CREATE TYPE "AiCostSource" AS ENUM (
  'CONFIGURED_PRICE',
  'UNPRICED',
  'USAGE_UNAVAILABLE'
);

ALTER TABLE "PlayerAiSuggestion"
  ADD COLUMN "targetField" TEXT,
  ADD COLUMN "fingerprint" TEXT,
  ADD COLUMN "contextVersionId" TEXT,
  ADD COLUMN "aiUsageEventId" TEXT,
  ADD COLUMN "appliedContentHash" TEXT;

CREATE TABLE "AiUsageEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT,
  "tableId" TEXT,
  "characterId" TEXT,
  "suggestionId" TEXT,
  "useCase" "AiUseCase" NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "contextVersionId" TEXT,
  "inputTokens" INTEGER,
  "cachedInputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "imageCount" INTEGER,
  "latencyMs" INTEGER NOT NULL,
  "status" "AiUsageStatus" NOT NULL,
  "errorCode" TEXT,
  "pricingVersion" TEXT,
  "costMicrosUsd" BIGINT,
  "costSource" "AiCostSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiPricing" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "modality" "AiPricingModality" NOT NULL,
  "inputMicrosUsdPerMillion" BIGINT,
  "cachedInputMicrosUsdPerMillion" BIGINT,
  "outputMicrosUsdPerMillion" BIGINT,
  "imageMicrosUsd" BIGINT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsageEvent_requestId_key" ON "AiUsageEvent"("requestId");
CREATE INDEX "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");
CREATE INDEX "AiUsageEvent_useCase_createdAt_idx" ON "AiUsageEvent"("useCase", "createdAt");
CREATE INDEX "AiUsageEvent_provider_model_createdAt_idx" ON "AiUsageEvent"("provider", "model", "createdAt");
CREATE INDEX "AiUsageEvent_status_createdAt_idx" ON "AiUsageEvent"("status", "createdAt");
CREATE INDEX "AiUsageEvent_tableId_createdAt_idx" ON "AiUsageEvent"("tableId", "createdAt");
CREATE INDEX "AiUsageEvent_characterId_createdAt_idx" ON "AiUsageEvent"("characterId", "createdAt");
CREATE INDEX "AiUsageEvent_suggestionId_idx" ON "AiUsageEvent"("suggestionId");

CREATE UNIQUE INDEX "AiPricing_provider_model_modality_version_key" ON "AiPricing"("provider", "model", "modality", "version");
CREATE INDEX "AiPricing_provider_model_modality_effectiveFrom_idx" ON "AiPricing"("provider", "model", "modality", "effectiveFrom");

CREATE INDEX "PlayerAiSuggestion_fingerprint_createdAt_idx" ON "PlayerAiSuggestion"("fingerprint", "createdAt");

ALTER TABLE "PlayerAiSuggestion" ADD CONSTRAINT "PlayerAiSuggestion_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "ContextVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerAiSuggestion" ADD CONSTRAINT "PlayerAiSuggestion_aiUsageEventId_fkey" FOREIGN KEY ("aiUsageEventId") REFERENCES "AiUsageEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "PlayerAiSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
