-- CreateEnum
CREATE TYPE "CharacterTraitType" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "TableMissionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TableMissionSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES');

-- CreateTable
CREATE TABLE "CharacterTrait" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "type" "CharacterTraitType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableMission" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "TableMissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableMissionSubmission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TableMissionSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "masterNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableMissionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterTrait_tableId_characterId_createdAt_idx" ON "CharacterTrait"("tableId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "CharacterTrait_createdById_idx" ON "CharacterTrait"("createdById");

-- CreateIndex
CREATE INDEX "TableMission_tableId_status_createdAt_idx" ON "TableMission"("tableId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TableMission_createdById_idx" ON "TableMission"("createdById");

-- CreateIndex
CREATE INDEX "TableMissionSubmission_missionId_status_createdAt_idx" ON "TableMissionSubmission"("missionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TableMissionSubmission_userId_createdAt_idx" ON "TableMissionSubmission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TableMissionSubmission_characterId_createdAt_idx" ON "TableMissionSubmission"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "CharacterTrait" ADD CONSTRAINT "CharacterTrait_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTrait" ADD CONSTRAINT "CharacterTrait_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTrait" ADD CONSTRAINT "CharacterTrait_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMission" ADD CONSTRAINT "TableMission_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMission" ADD CONSTRAINT "TableMission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMissionSubmission" ADD CONSTRAINT "TableMissionSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "TableMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMissionSubmission" ADD CONSTRAINT "TableMissionSubmission_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMissionSubmission" ADD CONSTRAINT "TableMissionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
