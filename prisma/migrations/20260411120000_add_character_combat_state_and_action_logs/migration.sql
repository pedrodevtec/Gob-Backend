-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('READY', 'WOUNDED', 'DEFEATED');

-- AlterTable
ALTER TABLE "Character"
ADD COLUMN "currentHealth" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "status" "CharacterStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN "lastCombatAt" TIMESTAMP(3),
ADD COLUMN "lastRecoveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CharacterActionLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "outcome" TEXT NOT NULL,
    "availableAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterActionLog_characterId_actionType_createdAt_idx" ON "CharacterActionLog"("characterId", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "CharacterActionLog_characterId_actionType_referenceId_createdA_idx" ON "CharacterActionLog"("characterId", "actionType", "referenceId", "createdAt");

-- AddForeignKey
ALTER TABLE "CharacterActionLog" ADD CONSTRAINT "CharacterActionLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
