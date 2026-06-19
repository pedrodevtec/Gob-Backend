-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "TableMemberStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- AlterTable
ALTER TABLE "Table" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Table" ADD COLUMN "status" "TableStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "TableMember" ADD COLUMN "status" "TableMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "TableMember_tableId_status_idx" ON "TableMember"("tableId", "status");
