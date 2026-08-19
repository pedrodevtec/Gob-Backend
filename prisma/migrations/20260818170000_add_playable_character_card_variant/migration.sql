BEGIN;

ALTER TABLE "CharacterCardArtGeneration"
  ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'PORTRAIT',
  ADD COLUMN "briefing" VARCHAR(240);

CREATE INDEX "CharacterCardArtGeneration_characterId_variant_status_idx"
  ON "CharacterCardArtGeneration"("characterId", "variant", "status");

COMMIT;
