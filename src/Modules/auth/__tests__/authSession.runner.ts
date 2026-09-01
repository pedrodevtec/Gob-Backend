import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { AuthSessionRevokeReason } from "@prisma/client";
import { env } from "../../../config/env";
import { AppError } from "../../../errors/AppError";
import { AuthSessionService } from "../authSession.service";

const user = { id: "session-user", nome: "Jogador", email: "jogador@example.test",
  accountRole: "USER" as "USER" | "ADMIN", emailVerifiedAt: new Date() as Date | null, theme: null };

const fakeDb = () => {
  const users = [user]; const sessions: any[] = []; const tokens: any[] = [];
  let tail = Promise.resolve();
  const pick = (value: any, fields: any) => fields
    ? Object.fromEntries(Object.keys(fields).map(key => [key, value[key]])) : value;
  const authSession = {
    create: async ({ data, select }: any) => {
      const value = { id: data.id, familyId: data.familyId, userId: data.userId,
        createdAt: new Date(), expiresAt: data.expiresAt, lastUsedAt: null,
        revokedAt: null, revokeReason: null };
      sessions.push(value);
      tokens.push({ id: `refresh-${tokens.length + 1}`, sessionId: value.id,
        tokenHash: data.refreshTokens.create.tokenHash, createdAt: new Date(),
        expiresAt: data.refreshTokens.create.expiresAt, consumedAt: null, replacedByTokenId: null });
      return pick(value, select);
    },
    findUnique: async ({ where, include, select }: any) => {
      const value = sessions.find(entry => entry.id === where.id); if (!value) return null;
      return include?.user ? { ...value, user: users.find(entry => entry.id === value.userId) } : pick(value, select);
    },
    update: async ({ where, data, select }: any) => {
      const value = sessions.find(entry => entry.id === where.id); assert.ok(value);
      Object.assign(value, data); return pick(value, select);
    },
    updateMany: async ({ where, data }: any) => {
      const found = sessions.filter(entry => (where.id === undefined || entry.id === where.id) &&
        (where.userId === undefined || entry.userId === where.userId) &&
        (where.revokedAt !== null || entry.revokedAt === null));
      found.forEach(entry => Object.assign(entry, data)); return { count: found.length };
    },
  };
  const authRefreshToken = {
    findUnique: async ({ where, include, select }: any) => {
      const value = tokens.find(entry => entry.tokenHash === where.tokenHash || entry.id === where.id);
      if (!value) return null;
      if (include?.session) { const session = sessions.find(entry => entry.id === value.sessionId);
        return { ...value, session: { ...session, user: users.find(entry => entry.id === session.userId) } }; }
      return pick(value, select);
    },
    create: async ({ data }: any) => { const value = { ...data, createdAt: new Date(), consumedAt: null, replacedByTokenId: null };
      tokens.push(value); return value; },
    update: async ({ where, data }: any) => { const value = tokens.find(entry => entry.id === where.id); assert.ok(value);
      Object.assign(value, data); return value; },
  };
  const db: any = { authSession, authRefreshToken, $queryRaw: async () => [],
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      const previous = tail; let release!: () => void;
      tail = new Promise<void>(resolve => { release = resolve; }); await previous;
      try { return await callback(db); } finally { release(); }
    } };
  return { db, users, sessions, tokens };
};

const hasCode = (code: string) => (error: unknown) => error instanceof AppError && error.code === code;

void (async () => {
  const state = fakeDb(); let now = new Date();
  AuthSessionService.setDbForTests(state.db);
  AuthSessionService.setClockForTests(() => new Date(now));

  const login = await AuthSessionService.createSession(user);
  assert.equal(state.tokens[0].tokenHash, AuthSessionService.hashRefreshToken(login.refreshToken));
  assert.notEqual(state.tokens[0].tokenHash, login.refreshToken);
  const claims = AuthSessionService.verifyAccessToken(login.accessToken);
  assert.equal(claims.sub, user.id); assert.equal(claims.sid, login.session.id);
  assert.ok(claims.exp * 1_000 - Date.now() <= 600_000);

  const concurrent = await Promise.allSettled([
    AuthSessionService.refresh(login.refreshToken), AuthSessionService.refresh(login.refreshToken),
  ]);
  assert.equal(concurrent.filter(item => item.status === "fulfilled").length, 1);
  assert.ok(hasCode("REFRESH_ALREADY_ROTATED")((concurrent.find(item => item.status === "rejected") as PromiseRejectedResult).reason));
  const rotated = (concurrent.find(item => item.status === "fulfilled") as PromiseFulfilledResult<any>).value;
  assert.equal(rotated.session.id, login.session.id);
  assert.equal(state.tokens[0].replacedByTokenId, state.tokens[1].id);

  now = new Date(state.tokens[0].consumedAt.getTime() + 5_000);
  await assert.rejects(AuthSessionService.refresh(login.refreshToken), hasCode("REFRESH_TOKEN_REUSED"));
  assert.equal(state.sessions[0].revokeReason, AuthSessionRevokeReason.REFRESH_TOKEN_REUSED);
  await assert.rejects(AuthSessionService.validateActiveSession(claims), hasCode("SESSION_REVOKED"));

  now = new Date();
  const logoutSession = await AuthSessionService.createSession(user);
  const logoutRotated = await AuthSessionService.refresh(logoutSession.refreshToken);
  assert.equal((await AuthSessionService.logout(logoutSession.refreshToken)).outcome, "revoked");
  assert.equal((await AuthSessionService.logout(logoutRotated.refreshToken)).outcome, "already_inactive");
  await assert.rejects(AuthSessionService.validateActiveSession(
    AuthSessionService.verifyAccessToken(logoutRotated.accessToken)), hasCode("SESSION_REVOKED"));
  assert.equal((await AuthSessionService.logout("unknown-refresh-token-with-thirty-two-chars")).outcome, "already_inactive");

  const roleSession = await AuthSessionService.createSession(user); state.users[0].accountRole = "ADMIN";
  await assert.rejects(AuthSessionService.validateActiveSession(
    AuthSessionService.verifyAccessToken(roleSession.accessToken)), hasCode("SESSION_REVOKED"));
  assert.ok(state.sessions.every(session => session.revokedAt));

  state.users[0].accountRole = "USER";
  const unverified = await AuthSessionService.createSession(user);
  state.users[0].emailVerifiedAt = null;
  await assert.rejects(AuthSessionService.validateActiveSession(
    AuthSessionService.verifyAccessToken(unverified.accessToken)), hasCode("EMAIL_NOT_VERIFIED"));
  state.users[0].emailVerifiedAt = new Date();

  const expired = await AuthSessionService.createSession(user);
  const expiredRecord = state.sessions.find(item => item.id === expired.session.id);
  expiredRecord.expiresAt = new Date(now.getTime() - 1);
  await assert.rejects(AuthSessionService.refresh(expired.refreshToken), hasCode("SESSION_EXPIRED"));
  assert.equal(expiredRecord.revokeReason, AuthSessionRevokeReason.SESSION_EXPIRED);

  const expiredAccess = jwt.sign({ sid: "expired", accountRole: "USER" }, env.JWT_SECRET,
    { algorithm: "HS256", subject: user.id, issuer: "gob-backend", audience: "gob-frontend", jwtid: "expired", expiresIn: -1 });
  assert.throws(() => AuthSessionService.verifyAccessToken(expiredAccess), hasCode("TOKEN_EXPIRED"));
  AuthSessionService.resetForTests(); console.log("Persistent auth session tests completed.");
})().catch(error => { AuthSessionService.resetForTests(); console.error(error); process.exit(1); });
