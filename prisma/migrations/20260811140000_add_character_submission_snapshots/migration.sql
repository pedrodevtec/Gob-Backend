CREATE TABLE "CharacterSubmissionSnapshot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sheetRevision" INTEGER NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "builderConfigVersion" TEXT NOT NULL,
    "contextVersionId" TEXT NOT NULL,
    "characterSnapshot" JSONB NOT NULL,
    "episodeAnswersSnapshot" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterSubmissionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterSubmissionSnapshot_characterId_sheetRevision_key" ON "CharacterSubmissionSnapshot"("characterId", "sheetRevision");
CREATE INDEX "CharacterSubmissionSnapshot_characterId_submittedAt_idx" ON "CharacterSubmissionSnapshot"("characterId", "submittedAt");
CREATE INDEX "CharacterSubmissionSnapshot_submittedById_submittedAt_idx" ON "CharacterSubmissionSnapshot"("submittedById", "submittedAt");
CREATE INDEX "CharacterSubmissionSnapshot_contextVersionId_idx" ON "CharacterSubmissionSnapshot"("contextVersionId");
CREATE INDEX "CharacterSubmissionSnapshot_approvedById_approvedAt_idx" ON "CharacterSubmissionSnapshot"("approvedById", "approvedAt");

ALTER TABLE "CharacterSubmissionSnapshot" ADD CONSTRAINT "CharacterSubmissionSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharacterSubmissionSnapshot" ADD CONSTRAINT "CharacterSubmissionSnapshot_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CharacterSubmissionSnapshot" ADD CONSTRAINT "CharacterSubmissionSnapshot_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "ContextVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CharacterSubmissionSnapshot" ADD CONSTRAINT "CharacterSubmissionSnapshot_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
