-- Precos publicos da OpenAI vigentes para os modelos usados pelo piloto.
-- Valores monetarios sao armazenados em micros de USD.
INSERT INTO "AiPricing" (
  "id", "provider", "model", "modality",
  "inputMicrosUsdPerMillion", "cachedInputMicrosUsdPerMillion", "outputMicrosUsdPerMillion",
  "imageMicrosUsd", "currency", "effectiveFrom", "version"
) VALUES (
  'openai-gpt-5-nano-text-2025-08-07', 'openai', 'gpt-5-nano', 'TEXT',
  50000, 5000, 400000, NULL, 'USD', '2025-08-07T00:00:00.000Z', 'openai-2025-08-07'
), (
  'openai-gpt-image-1-5-medium-portrait-2025-12-16', 'openai', 'gpt-image-1.5', 'IMAGE',
  NULL, NULL, NULL, 50000, 'USD', '2025-12-16T00:00:00.000Z', 'openai-2025-12-16-medium-1024x1536'
)
ON CONFLICT ("provider", "model", "modality", "version") DO NOTHING;

-- Recalcula eventos de texto existentes que ficaram sem preco antes do catalogo ser carregado.
UPDATE "AiUsageEvent"
SET
  "costMicrosUsd" =
    (GREATEST(COALESCE("inputTokens", 0) - COALESCE("cachedInputTokens", 0), 0)::BIGINT * 50000 / 1000000) +
    (COALESCE("cachedInputTokens", 0)::BIGINT * 5000 / 1000000) +
    (COALESCE("outputTokens", 0)::BIGINT * 400000 / 1000000),
  "pricingVersion" = 'openai-2025-08-07',
  "costSource" = 'CONFIGURED_PRICE'
WHERE "provider" = 'openai'
  AND "model" = 'gpt-5-nano'
  AND "costMicrosUsd" IS NULL
  AND "costSource" = 'UNPRICED'
  AND ("inputTokens" IS NOT NULL OR "cachedInputTokens" IS NOT NULL OR "outputTokens" IS NOT NULL);

-- O gerador usa uma imagem medium 1024x1536 por chamada.
UPDATE "AiUsageEvent"
SET
  "costMicrosUsd" = COALESCE("imageCount", 0)::BIGINT * 50000,
  "pricingVersion" = 'openai-2025-12-16-medium-1024x1536',
  "costSource" = 'CONFIGURED_PRICE'
WHERE "provider" = 'openai'
  AND "model" = 'gpt-image-1.5'
  AND "costMicrosUsd" IS NULL
  AND "costSource" = 'UNPRICED'
  AND "imageCount" IS NOT NULL;
