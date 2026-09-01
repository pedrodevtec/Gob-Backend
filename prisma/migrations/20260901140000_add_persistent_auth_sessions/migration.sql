CREATE TYPE "AuthSessionRevokeReason" AS ENUM (
  'LOGOUT',
  'REFRESH_TOKEN_REUSED',
  'SESSION_EXPIRED',
  'ACCOUNT_ROLE_CHANGED',
  'MEMBERSHIP_CHANGED',
  'USER_DELETED',
  'PASSWORD_CHANGED',
  'SECURITY'
);

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokeReason" "AuthSessionRevokeReason",
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthRefreshToken" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "replacedByTokenId" TEXT,
  CONSTRAINT "AuthRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_familyId_key" ON "AuthSession"("familyId");
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_idx" ON "AuthSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "AuthSession_familyId_revokedAt_idx" ON "AuthSession"("familyId", "revokedAt");
CREATE UNIQUE INDEX "AuthRefreshToken_tokenHash_key" ON "AuthRefreshToken"("tokenHash");
CREATE UNIQUE INDEX "AuthRefreshToken_replacedByTokenId_key" ON "AuthRefreshToken"("replacedByTokenId");
CREATE INDEX "AuthRefreshToken_sessionId_createdAt_idx" ON "AuthRefreshToken"("sessionId", "createdAt");
CREATE INDEX "AuthRefreshToken_sessionId_consumedAt_expiresAt_idx" ON "AuthRefreshToken"("sessionId", "consumedAt", "expiresAt");

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthRefreshToken"
  ADD CONSTRAINT "AuthRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthRefreshToken"
  ADD CONSTRAINT "AuthRefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "AuthRefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION revoke_sessions_after_account_role_change() RETURNS trigger AS $$
BEGIN
  IF OLD."accountRole" IS DISTINCT FROM NEW."accountRole" THEN
    UPDATE "AuthSession"
      SET "revokedAt" = COALESCE("revokedAt", CURRENT_TIMESTAMP),
          "revokeReason" = COALESCE("revokeReason", 'ACCOUNT_ROLE_CHANGED'::"AuthSessionRevokeReason")
      WHERE "userId" = NEW."id" AND "revokedAt" IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_revoke_sessions_after_role_change"
AFTER UPDATE OF "accountRole" ON "User"
FOR EACH ROW EXECUTE FUNCTION revoke_sessions_after_account_role_change();

CREATE FUNCTION revoke_sessions_after_membership_change() RETURNS trigger AS $$
DECLARE affected_user_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_user_id := OLD."userId";
  ELSE
    affected_user_id := NEW."userId";
  END IF;
  IF TG_OP = 'DELETE' OR OLD."role" IS DISTINCT FROM NEW."role"
     OR OLD."status" IS DISTINCT FROM NEW."status" THEN
    UPDATE "AuthSession"
      SET "revokedAt" = COALESCE("revokedAt", CURRENT_TIMESTAMP),
          "revokeReason" = COALESCE("revokeReason", 'MEMBERSHIP_CHANGED'::"AuthSessionRevokeReason")
      WHERE "userId" = affected_user_id AND "revokedAt" IS NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TableMember_revoke_sessions_after_change"
AFTER UPDATE OF "role", "status" OR DELETE ON "TableMember"
FOR EACH ROW EXECUTE FUNCTION revoke_sessions_after_membership_change();
