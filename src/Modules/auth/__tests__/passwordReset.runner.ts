import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { AuthSessionRevokeReason } from "@prisma/client";
import { env } from "../../../config/env";
import {
  resetEmailSenderForTests,
  setEmailSenderForTests,
  type SendPasswordResetInput,
} from "../email.sender";
import { PasswordResetService } from "../passwordReset.service";

type ResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

const now = new Date("2026-09-02T18:00:00.000Z");
const user = {
  id: "user-password-reset",
  nome: "Jogador",
  email: "jogador@example.com",
  senha: "old-hash",
};

const createState = () => {
  const tokens: ResetToken[] = [];
  const sessions = [{ userId: user.id, revokedAt: null as Date | null, revokeReason: null as string | null }];
  const currentUser = { ...user };

  const db: any = {
    user: {
      findUnique: async ({ where }: any) => where.email === currentUser.email ? currentUser : null,
      update: async ({ where, data }: any) => {
        assert.equal(where.id, currentUser.id);
        Object.assign(currentUser, data);
        return currentUser;
      },
    },
    passwordResetToken: {
      findFirst: async ({ where }: any) =>
        tokens
          .filter((token) => token.userId === where.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      findUnique: async ({ where }: any) =>
        tokens.find((token) => token.tokenHash === where.tokenHash) ?? null,
      create: async ({ data }: any) => {
        const created = {
          id: `reset-${tokens.length + 1}`,
          consumedAt: null,
          createdAt: now,
          ...data,
        } as ResetToken;
        tokens.push(created);
        return created;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const token of tokens) {
          if (where.id && token.id !== where.id) continue;
          if (where.userId && token.userId !== where.userId) continue;
          if (where.consumedAt === null && token.consumedAt !== null) continue;
          if (where.expiresAt?.gt && token.expiresAt <= where.expiresAt.gt) continue;
          Object.assign(token, data);
          count += 1;
        }
        return { count };
      },
    },
    authSession: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const session of sessions) {
          if (session.userId !== where.userId || session.revokedAt !== null) continue;
          Object.assign(session, data);
          count += 1;
        }
        return { count };
      },
    },
  };
  db.$transaction = async (callback: (tx: any) => unknown) => callback(db);
  return { db, tokens, sessions, currentUser };
};

const hasCode = (code: string) => (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === code;

(async () => {
  const originalEnv = {
    APP_WEB_URL: env.APP_WEB_URL,
    PASSWORD_RESET_TTL_MINUTES: env.PASSWORD_RESET_TTL_MINUTES,
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  };
  const state = createState();
  const sent: SendPasswordResetInput[] = [];

  env.APP_WEB_URL = "https://app.example.test";
  env.PASSWORD_RESET_TTL_MINUTES = 30;
  env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;
  PasswordResetService.setDbForTests(state.db);
  PasswordResetService.setClockForTests(() => now);
  setEmailSenderForTests({
    async sendEmailVerification() {},
    async sendPasswordReset(input) { sent.push(input); },
  });

  const unknown = await PasswordResetService.request("desconhecido@example.com");
  const known = await PasswordResetService.request(user.email);
  assert.equal(unknown.message, known.message, "resposta nao pode revelar se a conta existe");
  assert.equal(sent.length, 1);
  assert.equal(state.tokens.length, 1);

  const resetUrl = new URL(sent[0].resetUrl);
  const rawToken = resetUrl.searchParams.get("token");
  assert.ok(rawToken);
  assert.equal(resetUrl.origin, "https://app.example.test");
  assert.equal(state.tokens[0].tokenHash, PasswordResetService.hashToken(rawToken));
  assert.equal(JSON.stringify(state.tokens).includes(rawToken), false, "token puro nao deve ser persistido");

  await PasswordResetService.request(user.email);
  assert.equal(sent.length, 1, "cooldown deve manter resposta generica sem novo envio");

  assert.deepEqual(
    await PasswordResetService.confirm(rawToken, "novaSenha123"),
    { code: "PASSWORD_RESET_COMPLETED" }
  );
  assert.equal(await bcrypt.compare("novaSenha123", state.currentUser.senha), true);
  assert.ok(state.tokens[0].consumedAt);
  assert.ok(state.sessions[0].revokedAt);
  assert.equal(state.sessions[0].revokeReason, AuthSessionRevokeReason.PASSWORD_CHANGED);
  await assert.rejects(
    PasswordResetService.confirm(rawToken, "outraSenha123"),
    hasCode("PASSWORD_RESET_TOKEN_INVALID")
  );

  const expiredState = createState();
  expiredState.tokens.push({
    id: "expired",
    userId: user.id,
    tokenHash: PasswordResetService.hashToken("expired-token-with-enough-length"),
    expiresAt: new Date(now.getTime() - 1),
    consumedAt: null,
    createdAt: new Date(now.getTime() - 31 * 60_000),
  });
  PasswordResetService.setDbForTests(expiredState.db);
  await assert.rejects(
    PasswordResetService.confirm("expired-token-with-enough-length", "novaSenha123"),
    hasCode("PASSWORD_RESET_TOKEN_EXPIRED")
  );

  console.log("Password reset tests completed.");
  Object.assign(env, originalEnv);
  PasswordResetService.resetForTests();
  resetEmailSenderForTests();
})().catch((error) => {
  PasswordResetService.resetForTests();
  resetEmailSenderForTests();
  console.error(error);
  process.exit(1);
});
