-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "isEquipped" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "equippedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "claimKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "metadata" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_claimKey_key" ON "RewardClaim"("claimKey");

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
