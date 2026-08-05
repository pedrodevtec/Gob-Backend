/*
  Warnings:

  - The values [INVITED] on the enum `TableMemberStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TableMemberStatus_new" AS ENUM ('ACTIVE', 'REMOVED');
ALTER TABLE "public"."TableMember" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "TableMember" ALTER COLUMN "status" TYPE "TableMemberStatus_new" USING ("status"::text::"TableMemberStatus_new");
ALTER TYPE "TableMemberStatus" RENAME TO "TableMemberStatus_old";
ALTER TYPE "TableMemberStatus_new" RENAME TO "TableMemberStatus";
DROP TYPE "public"."TableMemberStatus_old";
ALTER TABLE "TableMember" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "BountyHunt" ALTER COLUMN "title" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Character" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CharacterEpisodeAnswer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CharacterMissionSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CombatSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MissionDefinition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NpcDefinition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TableMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrainingDefinition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "CharacterActionLog_characterId_actionType_referenceId_createdA_" RENAME TO "CharacterActionLog_characterId_actionType_referenceId_creat_idx";

-- RenameIndex
ALTER INDEX "CharacterTraitSuggestion_tableId_characterId_status_createdAt_i" RENAME TO "CharacterTraitSuggestion_tableId_characterId_status_created_idx";
