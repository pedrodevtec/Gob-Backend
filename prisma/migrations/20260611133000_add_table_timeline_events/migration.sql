-- CreateEnum
CREATE TYPE "TableTimelineEventType" AS ENUM ('STORY', 'MISSION_CREATED', 'MISSION_APPROVED', 'CHARACTER_APPROVED', 'REWARD', 'MASTER_NOTE', 'SESSION_SUMMARY');

-- CreateTable
CREATE TABLE "TableTimelineEvent" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "characterId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TableTimelineEventType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableTimelineEvent_tableId_createdAt_idx" ON "TableTimelineEvent"("tableId", "createdAt");

-- CreateIndex
CREATE INDEX "TableTimelineEvent_characterId_createdAt_idx" ON "TableTimelineEvent"("characterId", "createdAt");

-- CreateIndex
CREATE INDEX "TableTimelineEvent_createdById_idx" ON "TableTimelineEvent"("createdById");

-- AddForeignKey
ALTER TABLE "TableTimelineEvent" ADD CONSTRAINT "TableTimelineEvent_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableTimelineEvent" ADD CONSTRAINT "TableTimelineEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableTimelineEvent" ADD CONSTRAINT "TableTimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
