ALTER TABLE "Character"
ADD COLUMN "builderConfigVersion" TEXT NOT NULL DEFAULT 'pilot-v1',
ADD COLUMN "narrativeResponses" JSONB,
ADD COLUMN "confirmedNarrativeContext" JSONB,
ADD COLUMN "playStylePreference" TEXT;

UPDATE "Character" AS character
SET "builderConfigVersion" = campaign."builderConfigVersion"
FROM "PublicCampaign" AS campaign
WHERE campaign."tableId" = character."tableId";
