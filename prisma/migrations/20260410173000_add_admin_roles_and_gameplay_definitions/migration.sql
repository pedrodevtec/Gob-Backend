-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GameplayDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'ELITE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PLAYER';

-- AlterTable
ALTER TABLE "BountyHunt"
ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Bounty',
ADD COLUMN "description" TEXT,
ADD COLUMN "recommendedLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "difficulty" "GameplayDifficulty" NOT NULL DEFAULT 'EASY',
ADD COLUMN "rewardXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardItemName" TEXT,
ADD COLUMN "rewardItemCategory" TEXT,
ADD COLUMN "rewardItemType" TEXT,
ADD COLUMN "rewardItemImg" TEXT,
ADD COLUMN "rewardItemEffect" TEXT,
ADD COLUMN "rewardItemValue" INTEGER,
ADD COLUMN "rewardItemQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "MissionDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "GameplayDifficulty" NOT NULL DEFAULT 'EASY',
    "recommendedLevel" INTEGER NOT NULL DEFAULT 1,
    "enemyName" TEXT NOT NULL,
    "enemyLevel" INTEGER NOT NULL,
    "enemyHealth" INTEGER NOT NULL,
    "enemyAttack" INTEGER NOT NULL,
    "enemyDefense" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL,
    "rewardItemName" TEXT,
    "rewardItemCategory" TEXT,
    "rewardItemType" TEXT,
    "rewardItemImg" TEXT,
    "rewardItemEffect" TEXT,
    "rewardItemValue" INTEGER,
    "rewardItemQuantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trainingType" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "coinsReward" INTEGER NOT NULL DEFAULT 0,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "description" TEXT,
    "dialogue" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "coinsReward" INTEGER NOT NULL DEFAULT 0,
    "rewardItemName" TEXT,
    "rewardItemCategory" TEXT,
    "rewardItemType" TEXT,
    "rewardItemImg" TEXT,
    "rewardItemEffect" TEXT,
    "rewardItemValue" INTEGER,
    "rewardItemQuantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpcDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Monster_name_key" ON "Monster"("name");

-- AddForeignKey
ALTER TABLE "BountyHunt" ADD CONSTRAINT "BountyHunt_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
