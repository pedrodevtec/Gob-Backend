import assert from "node:assert/strict";
import { AccountRole, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AppError } from "../../../errors/AppError";
import { AuthSessionService } from "../authSession.service";

if (process.env.RUN_AUTH_SESSION_DB_INTEGRATION !== "1") {
  throw new Error("Set RUN_AUTH_SESSION_DB_INTEGRATION=1 against an isolated migrated PostgreSQL database.");
}

const prisma = new PrismaClient();
const runId = randomUUID();
const userId = randomUUID();

void (async () => {
  const user = await prisma.user.create({
    data: {
      id: userId,
      nome: "Auth Integration",
      email: `auth-session-${runId}@example.test`,
      senha: "not-used-by-this-test",
      emailVerifiedAt: new Date(),
      accountRole: AccountRole.USER,
    },
  });

  const login = await AuthSessionService.createSession(user);
  const stored = await prisma.authRefreshToken.findUnique({
    where: { tokenHash: AuthSessionService.hashRefreshToken(login.refreshToken) },
  });
  assert.ok(stored);
  assert.notEqual(stored.tokenHash, login.refreshToken);

  const results = await Promise.allSettled([
    AuthSessionService.refresh(login.refreshToken),
    AuthSessionService.refresh(login.refreshToken),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof AppError);
  assert.equal(rejected.reason.code, "REFRESH_ALREADY_ROTATED");
  assert.equal(await prisma.authRefreshToken.count({ where: { sessionId: login.session.id } }), 2);

  const rotated = (results.find(result => result.status === "fulfilled") as PromiseFulfilledResult<any>).value;
  assert.equal((await AuthSessionService.logout(login.refreshToken)).outcome, "revoked");
  await assert.rejects(
    AuthSessionService.validateActiveSession(AuthSessionService.verifyAccessToken(rotated.accessToken)),
    (error: unknown) => error instanceof AppError && error.code === "SESSION_REVOKED"
  );

  const roleLogin = await AuthSessionService.createSession(user);
  await prisma.user.update({ where: { id: userId }, data: { accountRole: AccountRole.ADMIN } });
  const revoked = await prisma.authSession.findUnique({ where: { id: roleLogin.session.id } });
  assert.ok(revoked?.revokedAt);
  assert.equal(revoked?.revokeReason, "ACCOUNT_ROLE_CHANGED");

  console.log("Persistent auth session PostgreSQL integration tests completed.");
})().finally(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}).catch(error => {
  console.error(error);
  process.exit(1);
});
