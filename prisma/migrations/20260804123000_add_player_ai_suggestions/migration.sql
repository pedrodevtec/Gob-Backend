CREATE TYPE "PlayerAiSuggestionStatus" AS ENUM ('GENERATED', 'ACCEPTED', 'EDITED', 'DISCARDED');

CREATE TABLE "PlayerAiSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "characterId" TEXT,
    "useCase" TEXT NOT NULL,
    "builderConfigVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT,
    "suggestion" JSONB NOT NULL,
    "status" "PlayerAiSuggestionStatus" NOT NULL DEFAULT 'GENERATED',
    "decisionPayload" JSONB,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerAiSuggestion_userId_tableId_status_createdAt_idx" ON "PlayerAiSuggestion"("userId", "tableId", "status", "createdAt");
CREATE INDEX "PlayerAiSuggestion_characterId_status_createdAt_idx" ON "PlayerAiSuggestion"("characterId", "status", "createdAt");

ALTER TABLE "PlayerAiSuggestion" ADD CONSTRAINT "PlayerAiSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAiSuggestion" ADD CONSTRAINT "PlayerAiSuggestion_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAiSuggestion" ADD CONSTRAINT "PlayerAiSuggestion_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
