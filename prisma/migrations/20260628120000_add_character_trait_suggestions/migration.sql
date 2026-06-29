CREATE TYPE "CharacterTraitSuggestionSource" AS ENUM ('AI', 'MASTER');

CREATE TYPE "CharacterTraitSuggestionStatus" AS ENUM ('SUGGESTED', 'APPLIED', 'DISMISSED');

CREATE TABLE "CharacterTraitSuggestion" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "CharacterTraitType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "value" TEXT,
    "source" "CharacterTraitSuggestionSource" NOT NULL DEFAULT 'MASTER',
    "status" "CharacterTraitSuggestionStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterTraitSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharacterTraitSuggestion_tableId_characterId_status_createdAt_idx" ON "CharacterTraitSuggestion"("tableId", "characterId", "status", "createdAt");

CREATE INDEX "CharacterTraitSuggestion_createdById_idx" ON "CharacterTraitSuggestion"("createdById");

ALTER TABLE "CharacterTraitSuggestion" ADD CONSTRAINT "CharacterTraitSuggestion_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CharacterTraitSuggestion" ADD CONSTRAINT "CharacterTraitSuggestion_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CharacterTraitSuggestion" ADD CONSTRAINT "CharacterTraitSuggestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
