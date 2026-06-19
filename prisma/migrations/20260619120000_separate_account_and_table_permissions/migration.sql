-- Separate global account authorization from table-scoped membership authorization.
-- The legacy PostgreSQL enum may contain MASTER in some environments. It is
-- intentionally retained as an unused enum label if present, while all stored
-- non-admin values are normalized to USER.

-- Rename the global role enum and its user column without dropping data.
ALTER TYPE "UserRole" RENAME TO "AccountRole";
ALTER TABLE "User" RENAME COLUMN "role" TO "accountRole";

-- Normalize any accidentally persisted global MASTER values before PLAYER is
-- renamed to USER. The dynamic statement is required because MASTER may not
-- exist in every database's enum definition.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"AccountRole"'::regtype
      AND enumlabel = 'MASTER'
  ) THEN
    EXECUTE 'UPDATE "User" SET "accountRole" = ''PLAYER'' WHERE "accountRole"::text = ''MASTER''';
  END IF;
END
$$;

ALTER TYPE "AccountRole" RENAME VALUE 'PLAYER' TO 'USER';
ALTER TABLE "User" ALTER COLUMN "accountRole" SET DEFAULT 'USER';

-- Align the table ownership field with the API/domain terminology.
ALTER TABLE "Table" RENAME COLUMN "masterUserId" TO "masterId";
ALTER INDEX "Table_masterUserId_createdAt_idx" RENAME TO "Table_masterId_createdAt_idx";
ALTER TABLE "Table" RENAME CONSTRAINT "Table_masterUserId_fkey" TO "Table_masterId_fkey";

-- Extend the existing membership lifecycle state and rename the membership timestamp.
ALTER TYPE "TableMemberStatus" ADD VALUE 'INVITED';
ALTER TABLE "TableMember" RENAME COLUMN "createdAt" TO "joinedAt";

-- Repair existing ownership memberships without deleting or replacing rows.
UPDATE "TableMember" AS member
SET
  "role" = 'MASTER',
  "status" = 'ACTIVE'
FROM "Table" AS campaign_table
WHERE member."tableId" = campaign_table."id"
  AND member."userId" = campaign_table."masterId";

INSERT INTO "TableMember" ("id", "tableId", "userId", "role", "status", "joinedAt")
SELECT
  gen_random_uuid()::text,
  campaign_table."id",
  campaign_table."masterId",
  'MASTER',
  'ACTIVE',
  campaign_table."createdAt"
FROM "Table" AS campaign_table
WHERE NOT EXISTS (
  SELECT 1
  FROM "TableMember" AS member
  WHERE member."tableId" = campaign_table."id"
    AND member."userId" = campaign_table."masterId"
);

-- Existing non-master memberships were active before status existed.
UPDATE "TableMember" AS member
SET
  "role" = 'PLAYER',
  "status" = 'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1
  FROM "Table" AS campaign_table
  WHERE campaign_table."id" = member."tableId"
    AND campaign_table."masterId" = member."userId"
);

DROP INDEX "TableMember_userId_createdAt_idx";
DROP INDEX "TableMember_tableId_role_idx";
DROP INDEX "TableMember_tableId_status_idx";
CREATE INDEX "TableMember_userId_status_joinedAt_idx"
  ON "TableMember"("userId", "status", "joinedAt");
CREATE INDEX "TableMember_tableId_status_role_idx"
  ON "TableMember"("tableId", "status", "role");
