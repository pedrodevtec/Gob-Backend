-- CreateEnum
CREATE TYPE "MissionSessionStatus" AS ENUM ('IN_PROGRESS', 'READY_TO_TURN_IN', 'COMPLETED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CombatSessionStatus" AS ENUM ('IN_PROGRESS', 'VICTORY', 'DEFEAT', 'ESCAPED');

-- CreateEnum
CREATE TYPE "CombatSourceType" AS ENUM ('BOUNTY_HUNT', 'MISSION');

-- AlterTable
ALTER TABLE "Monster"
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "MissionDefinition"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "startNpcId" TEXT,
ADD COLUMN "completionNpcId" TEXT,
ADD COLUMN "startDialogue" TEXT,
ADD COLUMN "completionDialogue" TEXT,
ADD COLUMN "repeatCooldownSeconds" INTEGER NOT NULL DEFAULT 1800,
ADD COLUMN "journey" JSONB;

-- AlterTable
ALTER TABLE "NpcDefinition"
ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "CharacterMissionSession" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "status" "MissionSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentNodeId" TEXT NOT NULL,
    "selectedPath" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CharacterMissionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatSession" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "missionSessionId" TEXT,
    "sourceType" "CombatSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "CombatSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "enemyName" TEXT NOT NULL,
    "enemyImageUrl" TEXT,
    "enemyLevel" INTEGER NOT NULL,
    "enemyAttack" INTEGER NOT NULL,
    "enemyDefense" INTEGER NOT NULL,
    "enemyCurrentHealth" INTEGER NOT NULL,
    "enemyMaxHealth" INTEGER NOT NULL,
    "characterCurrentHealth" INTEGER NOT NULL,
    "characterMaxHealth" INTEGER NOT NULL,
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "availableAt" TIMESTAMP(3),
    "rewards" JSONB,
    "defeatPenalty" JSONB,
    "battleLog" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CombatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterMissionSession_characterId_missionId_status_idx" ON "CharacterMissionSession"("characterId", "missionId", "status");

-- CreateIndex
CREATE INDEX "CharacterMissionSession_characterId_updatedAt_idx" ON "CharacterMissionSession"("characterId", "updatedAt");

-- CreateIndex
CREATE INDEX "CombatSession_characterId_status_updatedAt_idx" ON "CombatSession"("characterId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "CombatSession_missionSessionId_status_idx" ON "CombatSession"("missionSessionId", "status");

-- AddForeignKey
ALTER TABLE "MissionDefinition" ADD CONSTRAINT "MissionDefinition_startNpcId_fkey" FOREIGN KEY ("startNpcId") REFERENCES "NpcDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDefinition" ADD CONSTRAINT "MissionDefinition_completionNpcId_fkey" FOREIGN KEY ("completionNpcId") REFERENCES "NpcDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMissionSession" ADD CONSTRAINT "CharacterMissionSession_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMissionSession" ADD CONSTRAINT "CharacterMissionSession_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatSession" ADD CONSTRAINT "CombatSession_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatSession" ADD CONSTRAINT "CombatSession_missionSessionId_fkey" FOREIGN KEY ("missionSessionId") REFERENCES "CharacterMissionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
