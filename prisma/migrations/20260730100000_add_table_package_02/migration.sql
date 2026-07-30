ALTER TYPE "TableStatus" RENAME TO "TableStatus_old";
CREATE TYPE "TableStatus" AS ENUM ('DRAFT', 'RECRUITING', 'PREPARED', 'IN_SESSION', 'CLOSED');
ALTER TABLE "Table" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Table" ALTER COLUMN "status" TYPE "TableStatus" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'RECRUITING'
    WHEN 'ARCHIVED' THEN 'CLOSED'
    ELSE "status"::text
  END
)::"TableStatus";
DROP TYPE "TableStatus_old";

CREATE TYPE "TableInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

ALTER TABLE "Table" ADD COLUMN "settingId" TEXT;
ALTER TABLE "Table" ADD COLUMN "episodeId" TEXT;
ALTER TABLE "Table" ADD COLUMN "contextVersionId" TEXT;

ALTER TABLE "Table" ALTER COLUMN "status" SET DEFAULT 'RECRUITING';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Table"
    WHERE "settingId" IS NULL OR "episodeId" IS NULL OR "contextVersionId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Pacote 02 exige migracao manual das mesas legadas para Setting/Episode/ContextVersion antes de aplicar NOT NULL.';
  END IF;
END $$;

ALTER TABLE "Table" ALTER COLUMN "settingId" SET NOT NULL;
ALTER TABLE "Table" ALTER COLUMN "episodeId" SET NOT NULL;
ALTER TABLE "Table" ALTER COLUMN "contextVersionId" SET NOT NULL;

ALTER TABLE "TableMember" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TableMember" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "TableInvitation" (
  "id" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "intendedRole" "TableMemberRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "TableInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" TEXT NOT NULL,
  "acceptedById" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TableInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TableInvitation_tokenHash_key" ON "TableInvitation"("tokenHash");
CREATE INDEX "TableInvitation_tableId_status_createdAt_idx" ON "TableInvitation"("tableId", "status", "createdAt");
CREATE INDEX "TableInvitation_invitedEmail_status_expiresAt_idx" ON "TableInvitation"("invitedEmail", "status", "expiresAt");
CREATE INDEX "TableInvitation_invitedById_createdAt_idx" ON "TableInvitation"("invitedById", "createdAt");
CREATE INDEX "TableInvitation_acceptedById_acceptedAt_idx" ON "TableInvitation"("acceptedById", "acceptedAt");

CREATE INDEX "Table_settingId_episodeId_status_createdAt_idx" ON "Table"("settingId", "episodeId", "status", "createdAt");
CREATE INDEX "Table_contextVersionId_idx" ON "Table"("contextVersionId");

ALTER TABLE "Table" ADD CONSTRAINT "Table_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "Setting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Table" ADD CONSTRAINT "Table_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Table" ADD CONSTRAINT "Table_contextVersionId_fkey" FOREIGN KEY ("contextVersionId") REFERENCES "ContextVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TableInvitation" ADD CONSTRAINT "TableInvitation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableInvitation" ADD CONSTRAINT "TableInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TableInvitation" ADD CONSTRAINT "TableInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
