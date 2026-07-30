CREATE TYPE "CharacterSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED');
CREATE TYPE "CharacterReviewAction" AS ENUM ('CHANGES_REQUESTED', 'APPROVED');

ALTER TABLE "Character" ADD COLUMN "concept" TEXT;
ALTER TABLE "Character" ADD COLUMN "origin" TEXT;
ALTER TABLE "Character" ADD COLUMN "appearance" TEXT;
ALTER TABLE "Character" ADD COLUMN "desire" TEXT;
ALTER TABLE "Character" ADD COLUMN "fear" TEXT;
ALTER TABLE "Character" ADD COLUMN "promiseOrGuilt" TEXT;
ALTER TABLE "Character" ADD COLUMN "reasonToActWithGroup" TEXT;
ALTER TABLE "Character" ADD COLUMN "markLocation" TEXT;
ALTER TABLE "Character" ADD COLUMN "markAppearance" TEXT;
ALTER TABLE "Character" ADD COLUMN "markReaction" TEXT;
ALTER TABLE "Character" ADD COLUMN "markAttitude" TEXT;
ALTER TABLE "Character" ADD COLUMN "archetypeKey" TEXT;
ALTER TABLE "Character" ADD COLUMN "attributes" JSONB;
ALTER TABLE "Character" ADD COLUMN "trainings" JSONB;
ALTER TABLE "Character" ADD COLUMN "positiveTrait" JSONB;
ALTER TABLE "Character" ADD COLUMN "negativeTrait" JSONB;
ALTER TABLE "Character" ADD COLUMN "narrativeBond" TEXT;
ALTER TABLE "Character" ADD COLUMN "personalHistory" TEXT;
ALTER TABLE "Character" ADD COLUMN "initialEquipment" JSONB;
ALTER TABLE "Character" ADD COLUMN "sheetStatus" "CharacterSheetStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Character" ADD COLUMN "sheetRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Character" ADD COLUMN "submittedRevision" INTEGER;
ALTER TABLE "Character" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Character" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Character" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Character" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "CharacterEpisodeAnswer" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "questionKey" TEXT NOT NULL,
  "promptSnapshot" TEXT,
  "answer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterEpisodeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CharacterReviewEvent" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "action" "CharacterReviewAction" NOT NULL,
  "reason" TEXT,
  "characterRevisionReviewed" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterEpisodeAnswer_characterId_questionKey_key" ON "CharacterEpisodeAnswer"("characterId", "questionKey");
CREATE INDEX "CharacterEpisodeAnswer_characterId_createdAt_idx" ON "CharacterEpisodeAnswer"("characterId", "createdAt");
CREATE INDEX "CharacterReviewEvent_characterId_createdAt_idx" ON "CharacterReviewEvent"("characterId", "createdAt");
CREATE INDEX "CharacterReviewEvent_reviewerUserId_createdAt_idx" ON "CharacterReviewEvent"("reviewerUserId", "createdAt");
CREATE INDEX "Character_tableId_userId_sheetStatus_createdAt_idx" ON "Character"("tableId", "userId", "sheetStatus", "createdAt");
CREATE INDEX "Character_approvedById_idx" ON "Character"("approvedById");

ALTER TABLE "Character" ADD CONSTRAINT "Character_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CharacterEpisodeAnswer" ADD CONSTRAINT "CharacterEpisodeAnswer_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterReviewEvent" ADD CONSTRAINT "CharacterReviewEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterReviewEvent" ADD CONSTRAINT "CharacterReviewEvent_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
