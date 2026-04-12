-- AlterTable
ALTER TABLE "User"
ADD COLUMN "theme" TEXT;

-- AlterTable
ALTER TABLE "Character"
ADD COLUMN "avatarId" TEXT,
ADD COLUMN "titleId" TEXT,
ADD COLUMN "bannerId" TEXT;
