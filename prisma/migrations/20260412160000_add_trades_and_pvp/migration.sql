CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'EXPIRED');
CREATE TYPE "TradeParticipantSide" AS ENUM ('REQUESTER', 'TARGET');
CREATE TYPE "TradeAssetType" AS ENUM ('ITEM', 'EQUIPMENT');

ALTER TABLE "Character"
ADD COLUMN "pvpRating" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN "pvpWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pvpLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastPvpAt" TIMESTAMP(3);

CREATE TABLE "Trade" (
  "id" TEXT NOT NULL,
  "requesterCharacterId" TEXT NOT NULL,
  "targetCharacterId" TEXT NOT NULL,
  "offeredCoins" INTEGER NOT NULL DEFAULT 0,
  "requestedCoins" INTEGER NOT NULL DEFAULT 0,
  "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeAsset" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "side" "TradeParticipantSide" NOT NULL,
  "assetType" "TradeAssetType" NOT NULL,
  "assetId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PvpMatch" (
  "id" TEXT NOT NULL,
  "challengerCharacterId" TEXT NOT NULL,
  "opponentCharacterId" TEXT NOT NULL,
  "winnerCharacterId" TEXT NOT NULL,
  "loserCharacterId" TEXT NOT NULL,
  "challengerRatingBefore" INTEGER NOT NULL,
  "challengerRatingAfter" INTEGER NOT NULL,
  "opponentRatingBefore" INTEGER NOT NULL,
  "opponentRatingAfter" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvpMatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Trade_requesterCharacterId_status_createdAt_idx" ON "Trade"("requesterCharacterId", "status", "createdAt");
CREATE INDEX "Trade_targetCharacterId_status_createdAt_idx" ON "Trade"("targetCharacterId", "status", "createdAt");
CREATE INDEX "TradeAsset_tradeId_side_idx" ON "TradeAsset"("tradeId", "side");
CREATE INDEX "PvpMatch_createdAt_idx" ON "PvpMatch"("createdAt");
CREATE INDEX "PvpMatch_winnerCharacterId_createdAt_idx" ON "PvpMatch"("winnerCharacterId", "createdAt");

ALTER TABLE "Trade"
ADD CONSTRAINT "Trade_requesterCharacterId_fkey" FOREIGN KEY ("requesterCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trade"
ADD CONSTRAINT "Trade_targetCharacterId_fkey" FOREIGN KEY ("targetCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TradeAsset"
ADD CONSTRAINT "TradeAsset_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PvpMatch"
ADD CONSTRAINT "PvpMatch_challengerCharacterId_fkey" FOREIGN KEY ("challengerCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PvpMatch"
ADD CONSTRAINT "PvpMatch_opponentCharacterId_fkey" FOREIGN KEY ("opponentCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PvpMatch"
ADD CONSTRAINT "PvpMatch_winnerCharacterId_fkey" FOREIGN KEY ("winnerCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PvpMatch"
ADD CONSTRAINT "PvpMatch_loserCharacterId_fkey" FOREIGN KEY ("loserCharacterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
