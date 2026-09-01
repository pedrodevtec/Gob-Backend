DROP TRIGGER IF EXISTS "TableMember_revoke_sessions_after_change" ON "TableMember";
DROP FUNCTION IF EXISTS revoke_sessions_after_membership_change();
DROP TRIGGER IF EXISTS "User_revoke_sessions_after_role_change" ON "User";
DROP FUNCTION IF EXISTS revoke_sessions_after_account_role_change();
DROP TABLE IF EXISTS "AuthRefreshToken";
DROP TABLE IF EXISTS "AuthSession";
DROP TYPE IF EXISTS "AuthSessionRevokeReason";
