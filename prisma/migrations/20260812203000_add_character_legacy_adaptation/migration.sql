CREATE TABLE "CharacterLegacyAdaptation" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "adaptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterLegacyAdaptation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterLegacyAdaptation_characterId_key"
ON "CharacterLegacyAdaptation"("characterId");

CREATE INDEX "CharacterLegacyAdaptation_adminUserId_adaptedAt_idx"
ON "CharacterLegacyAdaptation"("adminUserId", "adaptedAt");

ALTER TABLE "CharacterLegacyAdaptation"
ADD CONSTRAINT "CharacterLegacyAdaptation_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CharacterLegacyAdaptation"
ADD CONSTRAINT "CharacterLegacyAdaptation_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
