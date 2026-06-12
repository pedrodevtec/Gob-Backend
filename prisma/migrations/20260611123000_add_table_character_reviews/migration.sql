-- CreateEnum
CREATE TYPE "CharacterReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN "tableId" TEXT;

-- CreateTable
CREATE TABLE "CharacterReview" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "CharacterReviewStatus" NOT NULL DEFAULT 'PENDING',
    "masterFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_tableId_createdAt_idx" ON "Character"("tableId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterReview_tableId_characterId_key" ON "CharacterReview"("tableId", "characterId");

-- CreateIndex
CREATE INDEX "CharacterReview_tableId_status_createdAt_idx" ON "CharacterReview"("tableId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CharacterReview_characterId_idx" ON "CharacterReview"("characterId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterReview" ADD CONSTRAINT "CharacterReview_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterReview" ADD CONSTRAINT "CharacterReview_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
