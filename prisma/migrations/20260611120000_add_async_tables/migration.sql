-- CreateEnum
CREATE TYPE "TableMemberRole" AS ENUM ('MASTER', 'PLAYER');

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "masterUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableMember" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TableMemberRole" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableWorld" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "campaignTitle" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "tone" TEXT,
    "rules" JSONB,
    "characterCreationCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableWorld_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Table_joinCode_key" ON "Table"("joinCode");

-- CreateIndex
CREATE INDEX "Table_masterUserId_createdAt_idx" ON "Table"("masterUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TableMember_tableId_userId_key" ON "TableMember"("tableId", "userId");

-- CreateIndex
CREATE INDEX "TableMember_userId_createdAt_idx" ON "TableMember"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TableMember_tableId_role_idx" ON "TableMember"("tableId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TableWorld_tableId_key" ON "TableWorld"("tableId");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_masterUserId_fkey" FOREIGN KEY ("masterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMember" ADD CONSTRAINT "TableMember_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableMember" ADD CONSTRAINT "TableMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableWorld" ADD CONSTRAINT "TableWorld_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
