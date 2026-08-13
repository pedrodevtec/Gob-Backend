BEGIN;

ALTER TYPE "AiUseCase" ADD VALUE IF NOT EXISTS 'CHARACTER_CARD_ART_GENERATION';

CREATE TABLE "CharacterCardArtGeneration" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "submissionSnapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "promptVersion" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "mimeType" TEXT,
    "imageData" BYTEA,
    "aiUsageEventId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CharacterCardArtGeneration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterCardArtGeneration_characterId_attemptNumber_key"
ON "CharacterCardArtGeneration"("characterId", "attemptNumber");
CREATE INDEX "CharacterCardArtGeneration_userId_createdAt_idx"
ON "CharacterCardArtGeneration"("userId", "createdAt");
CREATE INDEX "CharacterCardArtGeneration_tableId_createdAt_idx"
ON "CharacterCardArtGeneration"("tableId", "createdAt");
CREATE INDEX "CharacterCardArtGeneration_submissionSnapshotId_idx"
ON "CharacterCardArtGeneration"("submissionSnapshotId");

ALTER TABLE "CharacterCardArtGeneration"
ADD CONSTRAINT "CharacterCardArtGeneration_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterCardArtGeneration"
ADD CONSTRAINT "CharacterCardArtGeneration_submissionSnapshotId_fkey"
FOREIGN KEY ("submissionSnapshotId") REFERENCES "CharacterSubmissionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterCardArtGeneration"
ADD CONSTRAINT "CharacterCardArtGeneration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterCardArtGeneration"
ADD CONSTRAINT "CharacterCardArtGeneration_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterCardArtGeneration"
ADD CONSTRAINT "CharacterCardArtGeneration_aiUsageEventId_fkey"
FOREIGN KEY ("aiUsageEventId") REFERENCES "AiUsageEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
