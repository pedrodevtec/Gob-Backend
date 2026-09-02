import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import { AddressInfo } from "node:net";
import { AppError } from "../../../errors/AppError";
import { env } from "../../../config/env";
import { errorHandler } from "../../../middleware/errorHandler";
import { requestContext } from "../../../middleware/requestContext";
import UserModel from "../../users/user.models";
import authRoutes from "../auth.routes";
import { AuthService } from "../auth.service";
import { AuthSessionService } from "../authSession.service";
import {
  ResendEmailSender,
  resetEmailSenderForTests,
  setEmailSenderForTests,
  SendEmailVerificationInput,
} from "../email.sender";
import { EmailVerificationService } from "../emailVerification.service";

type FakeUser = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  emailVerifiedAt: Date | null;
  accountRole: "USER" | "ADMIN";
  theme: string | null;
};

type FakeToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

const test = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const createFakeDb = (users: FakeUser[] = [], tokens: FakeToken[] = []) => {
  const tokenCreates: Array<{ userId: string; tokenHash: string; expiresAt: Date }> = [];

  const db = {
    user: {
      findUnique: async ({ where }: any) => {
        return users.find((user) => user.email === where.email || user.id === where.id) ?? null;
      },
      update: async ({ where, data }: any) => {
        const user = users.find((entry) => entry.id === where.id);
        if (!user) {
          throw new Error("User not found");
        }
        Object.assign(user, data);
        return user;
      },
    },
    emailVerificationToken: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const token of tokens) {
          if (where.id !== undefined && token.id !== where.id) continue;
          if (where.userId !== undefined && token.userId !== where.userId) continue;
          if (where.consumedAt === null && token.consumedAt !== null) continue;
          if (where.expiresAt?.gt && !(token.expiresAt > where.expiresAt.gt)) continue;
          Object.assign(token, data);
          count += 1;
        }
        return { count };
      },
      create: async ({ data }: any) => {
        tokenCreates.push(data);
        const token = {
          id: `token-${tokens.length + 1}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          consumedAt: null,
          createdAt: new Date(),
        };
        tokens.push(token);
        return token;
      },
      findUnique: async ({ where, include }: any) => {
        const token = tokens.find((entry) => entry.tokenHash === where.tokenHash) ?? null;
        if (!token || !include?.user) {
          return token;
        }

        return {
          ...token,
          user: users.find((user) => user.id === token.userId) ?? null,
        };
      },
      findFirst: async ({ where }: any) => {
        return tokens
          .filter((token) => token.userId === where.userId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
      },
      update: async ({ where, data }: any) => {
        const token = tokens.find((entry) => entry.id === where.id);
        if (!token) {
          throw new Error("Token not found");
        }
        Object.assign(token, data);
        return token;
      },
    },
    $transaction: async (callback: any) => callback(db),
  };

  return { db, users, tokens, tokenCreates };
};

const pendingUser = async (email = "novo@example.com"): Promise<FakeUser> => ({
  id: `user-${email}`,
  nome: "Novo Jogador",
  email,
  senha: await bcrypt.hash("segredo123", 10),
  emailVerifiedAt: null,
  accountRole: "USER",
  theme: null,
});

const verifiedUser = async (email = "verificado@example.com"): Promise<FakeUser> => ({
  ...(await pendingUser(email)),
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const withFakeSender = (sent: SendEmailVerificationInput[] = [], fail = false) => {
  setEmailSenderForTests({
    async sendEmailVerification(input) {
      sent.push(input);
      if (fail) {
        throw new Error(`provider leaked ${input.confirmationUrl}`);
      }
    },
    async sendPasswordReset() {},
  });
};

const createAuthTestServer = async () => {
  const app = express();
  const authBasePath = `/audit-${Date.now()}-${Math.random().toString(16).slice(2)}/auth`;
  app.use(requestContext);
  app.use(express.json());
  app.use(authBasePath, authRoutes);
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    authBasePath,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
};

const postJson = async (url: string, body: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
    serialized: await Promise.resolve(""),
  };
};

const serialize = (value: unknown): string => JSON.stringify(value);

const assertNoSensitiveResponseData = (
  value: unknown,
  forbiddenValues: string[] = []
): void => {
  const serialized = serialize(value);
  const forbiddenFragments = [
    "tokenHash",
    "verificationUrl",
    "confirmar-email",
    "RESEND_API_KEY",
    "Authorization",
    "provider leaked",
    ...forbiddenValues.filter(Boolean),
  ];

  for (const fragment of forbiddenFragments) {
    assert.equal(
      serialized.includes(fragment),
      false,
      `Response leaked forbidden fragment: ${fragment}`
    );
  }

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        assert.equal(/tokenHash|verificationUrl|hash/i.test(key), false, `Forbidden key: ${key}`);
        if (key === "token") {
          assert.fail("Cadastro ou fluxo de verificacao retornou propriedade token.");
        }
        visit(child);
      }
      return;
    }

    if (typeof node === "string") {
      assert.equal(node.includes("confirmar-email"), false);
      assert.equal(node.split(".").length === 3 && node.length > 80, false);
    }
  };

  visit(value);
};

const extractTokenFromUrl = (confirmationUrl: string): string => {
  const token = new URL(confirmationUrl).searchParams.get("token");
  assert.ok(token);
  return token;
};

const withUserModel = async (
  handlers: {
    findByEmail?: typeof UserModel.findByEmail;
    createUser?: typeof UserModel.createUser;
  },
  run: () => Promise<void>
): Promise<void> => {
  const originalFindByEmail = UserModel.findByEmail;
  const originalCreateUser = UserModel.createUser;
  if (handlers.findByEmail) {
    UserModel.findByEmail = handlers.findByEmail;
  }
  if (handlers.createUser) {
    UserModel.createUser = handlers.createUser;
  }

  try {
    await run();
  } finally {
    UserModel.findByEmail = originalFindByEmail;
    UserModel.createUser = originalCreateUser;
  }
};

void (async () => {
  await test("cadastro cria usuario nao verificado e nao emite JWT", async () => {
    const sent: SendEmailVerificationInput[] = [];
    const user = await pendingUser();
    const originalFindByEmail = UserModel.findByEmail;
    const originalCreateUser = UserModel.createUser;
    const { db } = createFakeDb([user]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);
    UserModel.findByEmail = async () => null;
    UserModel.createUser = async (_nome, _email, _senhaHash, emailVerifiedAt) => ({
      ...user,
      emailVerifiedAt,
    });

    try {
      const result = await AuthService.register({
        nome: user.nome,
        email: user.email,
        senha: "segredo123",
      });

      assert.equal("token" in result, false);
      assert.equal(result.user.emailVerifiedAt, null);
      assert.equal(result.emailVerificationRequired, true);
      assert.equal(sent.length, 1);
    } finally {
      UserModel.findByEmail = originalFindByEmail;
      UserModel.createUser = originalCreateUser;
    }
  });

  await test("token original nao e armazenado no banco", async () => {
    const user = await pendingUser();
    const sent: SendEmailVerificationInput[] = [];
    const { db, tokenCreates } = createFakeDb([user]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    await EmailVerificationService.createAndSend(user);

    const originalToken = new URL(sent[0].confirmationUrl).searchParams.get("token");
    assert.ok(originalToken);
    assert.notEqual(tokenCreates[0].tokenHash, originalToken);
    assert.equal(tokenCreates[0].tokenHash, EmailVerificationService.hashToken(originalToken));
  });

  await test("confirmacao valida verifica o usuario", async () => {
    const user = await pendingUser();
    const rawToken = "valid-token";
    const token: FakeToken = {
      id: "token-1",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    };
    const { db } = createFakeDb([user], [token]);
    EmailVerificationService.setDbForTests(db as any);

    const result = await EmailVerificationService.confirm(rawToken);

    assert.equal(result.code, "EMAIL_VERIFIED");
    assert.ok(user.emailVerifiedAt);
    assert.ok(token.consumedAt);
  });

  await test("duas confirmacoes simultaneas consomem o token apenas uma vez", async () => {
    const user = await pendingUser("concorrente@example.com");
    const rawToken = "concurrent-token";
    const token: FakeToken = {
      id: "token-concurrent",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    };
    const { db } = createFakeDb([user], [token]);
    let findUniqueWaiters = 0;
    let releaseFindUnique: (() => void) | undefined;
    const bothReadsStarted = new Promise<void>((resolve) => {
      releaseFindUnique = resolve;
    });
    const originalFindUnique = db.emailVerificationToken.findUnique;
    const originalUpdateMany = db.emailVerificationToken.updateMany;
    const consumeCounts: number[] = [];

    db.emailVerificationToken.findUnique = async (args: any) => {
      findUniqueWaiters += 1;
      if (findUniqueWaiters === 2) {
        releaseFindUnique?.();
      }
      await bothReadsStarted;
      const record = await originalFindUnique(args) as any;
      return record ? { ...record, user: record.user ? { ...record.user } : record.user } : record;
    };
    db.emailVerificationToken.updateMany = async (args: any) => {
      const result = await originalUpdateMany(args);
      if (args.where?.id === token.id) {
        consumeCounts.push(result.count);
      }
      return result;
    };
    EmailVerificationService.setDbForTests(db as any);

    const results = await Promise.allSettled([
      EmailVerificationService.confirm(rawToken),
      EmailVerificationService.confirm(rawToken),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal((fulfilled[0] as PromiseFulfilledResult<{ code: string }>).value.code, "EMAIL_VERIFIED");
    assert.equal(rejected.length, 1);
    assert.ok((rejected[0] as PromiseRejectedResult).reason instanceof AppError);
    assert.equal((rejected[0] as PromiseRejectedResult).reason.code, "EMAIL_VERIFICATION_TOKEN_INVALID");
    assert.deepEqual(consumeCounts.sort(), [0, 1]);
    assert.ok(token.consumedAt);
    assert.ok(user.emailVerifiedAt);
  });

  await test("token invalido e rejeitado", async () => {
    const { db } = createFakeDb();
    EmailVerificationService.setDbForTests(db as any);
    await assert.rejects(
      EmailVerificationService.confirm("missing-token"),
      (error: unknown) => error instanceof AppError && error.code === "EMAIL_VERIFICATION_TOKEN_INVALID"
    );
  });

  await test("token expirado e rejeitado", async () => {
    const user = await pendingUser();
    const token = "expired-token";
    const { db } = createFakeDb([user], [{
      id: "token-1",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(token),
      expiresAt: new Date(Date.now() - 1_000),
      consumedAt: null,
      createdAt: new Date(Date.now() - 120_000),
    }]);
    EmailVerificationService.setDbForTests(db as any);

    await assert.rejects(
      EmailVerificationService.confirm(token),
      (error: unknown) => error instanceof AppError && error.code === "EMAIL_VERIFICATION_TOKEN_EXPIRED"
    );
  });

  await test("token consumido nao pode ser reutilizado", async () => {
    const user = await verifiedUser();
    const token = "consumed-token";
    const { db } = createFakeDb([user], [{
      id: "token-1",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
      createdAt: new Date(),
    }]);
    EmailVerificationService.setDbForTests(db as any);

    await assert.rejects(
      EmailVerificationService.confirm(token),
      (error: unknown) => error instanceof AppError && error.code === "EMAIL_VERIFICATION_TOKEN_INVALID"
    );
  });

  await test("confirmacao valida de conta ja verificada retorna EMAIL_ALREADY_VERIFIED", async () => {
    const user = await verifiedUser("ja-verificado@example.com");
    const verifiedAt = user.emailVerifiedAt;
    const rawToken = "already-verified-token";
    const sent: SendEmailVerificationInput[] = [];
    const { db, tokens } = createFakeDb([user], [{
      id: "token-verified",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    }]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    await assert.rejects(
      EmailVerificationService.confirm(rawToken),
      (error: unknown) => error instanceof AppError && error.statusCode === 409 && error.code === "EMAIL_ALREADY_VERIFIED"
    );

    assert.equal(user.emailVerifiedAt, verifiedAt);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].consumedAt instanceof Date, true);
    assert.equal(sent.length, 0);
  });

  await test("reenvio gera novo token e invalida token anterior", async () => {
    const user = await pendingUser();
    const oldToken: FakeToken = {
      id: "token-1",
      userId: user.id,
      tokenHash: "old-hash",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(Date.now() - 120_000),
    };
    const sent: SendEmailVerificationInput[] = [];
    const { db, tokens } = createFakeDb([user], [oldToken]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    const result = await EmailVerificationService.resend(user.email);

    assert.equal(result.emailSent, true);
    assert.ok(oldToken.consumedAt);
    assert.equal(tokens.length, 2);
    assert.equal(sent.length, 1);
  });

  await test("token anterior ao reenvio e rejeitado e o novo token confirma", async () => {
    const user = await pendingUser("reenviado@example.com");
    const sent: SendEmailVerificationInput[] = [];
    const { db, tokens } = createFakeDb([user]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    await EmailVerificationService.createAndSend(user);
    tokens[0].createdAt = new Date(Date.now() - 120_000);
    const firstToken = extractTokenFromUrl(sent[0].confirmationUrl);

    await EmailVerificationService.resend(user.email);
    const secondToken = extractTokenFromUrl(sent[1].confirmationUrl);

    assert.notEqual(firstToken, secondToken);
    await assert.rejects(
      EmailVerificationService.confirm(firstToken),
      (error: unknown) => error instanceof AppError && error.code === "EMAIL_VERIFICATION_TOKEN_INVALID"
    );

    const result = await EmailVerificationService.confirm(secondToken);
    assert.equal(result.code, "EMAIL_VERIFIED");
    assert.ok(user.emailVerifiedAt);
  });

  await test("reenvio para conta inexistente nao revela inexistencia", async () => {
    const sent: SendEmailVerificationInput[] = [];
    const { db } = createFakeDb();
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    const result = await EmailVerificationService.resend("ausente@example.com");

    assert.equal(result.emailSent, false);
    assert.equal(sent.length, 0);
    assert.equal(result.message.includes("Se existir uma conta pendente"), true);
  });

  await test("reenvio para conta verificada nao envia mensagem", async () => {
    const user = await verifiedUser();
    const sent: SendEmailVerificationInput[] = [];
    const { db } = createFakeDb([user]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    const result = await EmailVerificationService.resend(user.email);

    assert.equal(result.emailSent, false);
    assert.equal(sent.length, 0);
  });

  await test("login de conta nao verificada e bloqueado", async () => {
    const user = await pendingUser();
    const originalFindByEmail = UserModel.findByEmail;
    UserModel.findByEmail = async () => user;

    try {
      await assert.rejects(
        AuthService.login({ email: user.email, senha: "segredo123" }),
        (error: unknown) => error instanceof AppError && error.code === "EMAIL_NOT_VERIFIED"
      );
    } finally {
      UserModel.findByEmail = originalFindByEmail;
    }
  });

  await test("usuario verificado consegue entrar", async () => {
    const user = await verifiedUser();
    const originalFindByEmail = UserModel.findByEmail;
    UserModel.findByEmail = async () => user;
    const originalCreateSession = AuthSessionService.createSession;
    AuthSessionService.createSession = (async (sessionUser: any) => ({
      accessToken: "access-token",
      accessTokenExpiresAt: new Date(Date.now() + 600_000),
      refreshToken: "refresh-token-with-at-least-thirty-two-characters",
      refreshTokenExpiresAt: new Date(Date.now() + 604_800_000),
      session: { id: "session-1", expiresAt: new Date(Date.now() + 604_800_000) },
      user: sessionUser,
    })) as typeof AuthSessionService.createSession;

    try {
      const result = await AuthService.login({ email: user.email, senha: "segredo123" });
      assert.equal(typeof result.accessToken, "string");
      assert.equal("token" in result, false);
      assert.equal(result.user.emailVerifiedAt, user.emailVerifiedAt);
    } finally {
      UserModel.findByEmail = originalFindByEmail;
      AuthSessionService.createSession = originalCreateSession;
    }
  });

  await test("usuarios existentes migrados permanecem aptos a entrar", async () => {
    const existingUser = await verifiedUser("existente@example.com");
    const originalFindByEmail = UserModel.findByEmail;
    UserModel.findByEmail = async () => existingUser;
    const originalCreateSession = AuthSessionService.createSession;
    AuthSessionService.createSession = (async (sessionUser: any) => ({
      accessToken: "access-token",
      accessTokenExpiresAt: new Date(Date.now() + 600_000),
      refreshToken: "refresh-token-with-at-least-thirty-two-characters",
      refreshTokenExpiresAt: new Date(Date.now() + 604_800_000),
      session: { id: "session-2", expiresAt: new Date(Date.now() + 604_800_000) },
      user: sessionUser,
    })) as typeof AuthSessionService.createSession;

    try {
      const result = await AuthService.login({
        email: existingUser.email,
        senha: "segredo123",
      });
      assert.equal(result.user.email, existingUser.email);
    } finally {
      UserModel.findByEmail = originalFindByEmail;
      AuthSessionService.createSession = originalCreateSession;
    }
  });

  await test("falha do provedor nao verifica a conta e nao expoe token em logs", async () => {
    const user = await pendingUser();
    const originalFindByEmail = UserModel.findByEmail;
    const originalCreateUser = UserModel.createUser;
    const originalError = console.error;
    let logOutput = "";
    const { db } = createFakeDb([user]);
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender([], true);
    console.error = (...args: unknown[]) => {
      logOutput += args.map(String).join(" ");
    };
    UserModel.findByEmail = async () => null;
    UserModel.createUser = async (_nome, _email, _senhaHash, emailVerifiedAt) => ({
      ...user,
      emailVerifiedAt,
    });

    try {
      const result = await AuthService.register({
        nome: user.nome,
        email: user.email,
        senha: "segredo123",
      });

      assert.equal(result.emailDelivery, "FAILED");
      assert.equal(result.user.emailVerifiedAt, null);
      assert.equal(logOutput.includes("confirmar-email"), false);
      assert.equal(logOutput.includes("token="), false);
    } finally {
      console.error = originalError;
      UserModel.findByEmail = originalFindByEmail;
      UserModel.createUser = originalCreateUser;
    }
  });

  await test("cooldown de reenvio impede abuso", async () => {
    const user = await pendingUser();
    const { db } = createFakeDb([user], [{
      id: "token-1",
      userId: user.id,
      tokenHash: "recent-hash",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    }]);
    EmailVerificationService.setDbForTests(db as any);

    await assert.rejects(
      EmailVerificationService.resend(user.email),
      (error: unknown) => error instanceof AppError && error.code === "EMAIL_VERIFICATION_RESEND_COOLDOWN"
    );
  });

  await test("POST register nao retorna token, hash, URL de confirmacao ou dados do provider", async () => {
    const user = await pendingUser("http-register@example.com");
    const sent: SendEmailVerificationInput[] = [];
    const { db } = createFakeDb([user]);
    const server = await createAuthTestServer();
    const originalError = console.error;
    let logOutput = "";
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent, true);
    console.error = (...args: unknown[]) => {
      logOutput += args.map(String).join(" ");
    };

    await withUserModel(
      {
        findByEmail: async () => null,
        createUser: async (_nome, _email, _senhaHash, emailVerifiedAt) => ({
          ...user,
          emailVerifiedAt,
        }),
      },
      async () => {
        try {
          const response = await postJson(`${server.baseUrl}${server.authBasePath}/register`, {
            nome: user.nome,
            email: user.email,
            senha: "segredo123",
          });

          assert.equal(response.status, 201);
          assert.equal(response.body.success, true);
          assert.equal(response.body.emailDelivery, "FAILED");
          assert.equal(response.body.emailVerificationRequired, true);
          assertNoSensitiveResponseData(response.body, [
            extractTokenFromUrl(sent[0].confirmationUrl),
            EmailVerificationService.hashToken(extractTokenFromUrl(sent[0].confirmationUrl)),
          ]);
          assert.equal(logOutput.includes(extractTokenFromUrl(sent[0].confirmationUrl)), false);
          assert.equal(logOutput.includes("confirmar-email"), false);
          assert.equal(logOutput.includes("tokenHash"), false);
          assert.equal(logOutput.includes("Authorization"), false);
          assert.equal(logOutput.includes("provider leaked"), false);
        } finally {
          console.error = originalError;
          await server.close();
        }
      }
    );
  });

  await test("POST confirm nao retorna token, hash, URL de confirmacao ou dados internos", async () => {
    const user = await pendingUser("http-confirm@example.com");
    const rawToken = EmailVerificationService.generateToken();
    const { db } = createFakeDb([user], [{
      id: "token-http-confirm",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    }]);
    const server = await createAuthTestServer();
    EmailVerificationService.setDbForTests(db as any);

    try {
      const response = await postJson(`${server.baseUrl}${server.authBasePath}/email-verification/confirm`, {
        token: rawToken,
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.code, "EMAIL_VERIFIED");
      assertNoSensitiveResponseData(response.body, [
        rawToken,
        EmailVerificationService.hashToken(rawToken),
      ]);
    } finally {
      await server.close();
    }
  });

  await test("POST confirm de conta ja verificada retorna EMAIL_ALREADY_VERIFIED com status HTTP", async () => {
    const user = await verifiedUser("http-already@example.com");
    const verifiedAt = user.emailVerifiedAt;
    const rawToken = EmailVerificationService.generateToken();
    const sent: SendEmailVerificationInput[] = [];
    const { db, tokens } = createFakeDb([user], [{
      id: "token-http-already",
      userId: user.id,
      tokenHash: EmailVerificationService.hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      createdAt: new Date(),
    }]);
    const server = await createAuthTestServer();
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    try {
      const response = await postJson(`${server.baseUrl}${server.authBasePath}/email-verification/confirm`, {
        token: rawToken,
      });

      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, "EMAIL_ALREADY_VERIFIED");
      assert.equal(user.emailVerifiedAt, verifiedAt);
      assert.equal(tokens.length, 1);
      assert.equal(sent.length, 0);
      assertNoSensitiveResponseData(response.body, [
        rawToken,
        EmailVerificationService.hashToken(rawToken),
      ]);
    } finally {
      await server.close();
    }
  });

  await test("POST resend passa pela rota real e aplica rate limit sem revelar conta", async () => {
    const sent: SendEmailVerificationInput[] = [];
    const { db } = createFakeDb();
    const server = await createAuthTestServer();
    EmailVerificationService.setDbForTests(db as any);
    withFakeSender(sent);

    try {
      const responses = [];
      for (let index = 0; index < 6; index += 1) {
        responses.push(
          await postJson(`${server.baseUrl}${server.authBasePath}/email-verification/resend`, {
            email: "ausente-rate-limit@example.com",
          })
        );
      }

      for (const response of responses.slice(0, 5)) {
        assert.equal(response.status, 200);
        assert.equal(response.body.success, true);
        assert.equal(
          response.body.message,
          "Se existir uma conta pendente para este e-mail, enviaremos uma nova confirmacao."
        );
        assertNoSensitiveResponseData(response.body);
      }

      const blocked = responses[5];
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.error.code, "RATE_LIMIT_EXCEEDED");
      assert.equal(sent.length, 0);
      assertNoSensitiveResponseData(blocked.body);
    } finally {
      await server.close();
    }
  });

  await test("adapter Resend monta request correto sem chamada de rede real", async () => {
    const originalFetch = global.fetch;
    const originalEnv = {
      NODE_ENV: env.NODE_ENV,
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      APP_WEB_URL: env.APP_WEB_URL,
    };
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const secret = "test-resend-key";
    const rawToken = "adapter-token";
    let confirmationUrl = "";

    env.NODE_ENV = "test";
    env.RESEND_API_KEY = secret;
    env.EMAIL_FROM = "Guardian <noreply@example.com>";
    env.APP_WEB_URL = "https://app.example.test";
    confirmationUrl = EmailVerificationService.buildConfirmationUrl(rawToken);
    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return { ok: true, status: 200 } as Response;
    }) as typeof fetch;

    try {
      await new ResendEmailSender().sendEmailVerification({
        to: "jogador@example.com",
        nome: "Jogador",
        confirmationUrl,
        expiresAt: new Date("2026-07-29T12:00:00.000Z"),
      });

      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, "https://api.resend.com/emails");
      assert.equal(requests[0].init.method, "POST");
      assert.equal((requests[0].init.headers as Record<string, string>).Authorization, `Bearer ${secret}`);
      const payload = JSON.parse(String(requests[0].init.body));
      assert.equal(payload.from, "Guardian <noreply@example.com>");
      assert.equal(payload.to, "jogador@example.com");
      assert.equal(payload.subject, "Confirme seu e-mail - Guardian of Bravantus");
      assert.equal(payload.text.includes("Uma conta foi criada"), true);
      assert.equal(payload.text.includes("https://app.example.test/confirmar-email?token=adapter-token"), true);
      assert.equal(payload.html.includes("Confirmar e-mail"), true);
    } finally {
      global.fetch = originalFetch;
      Object.assign(env, originalEnv);
    }
  });

  await test("adapter Resend trata erro sem expor chave, token ou payload em logs", async () => {
    const originalFetch = global.fetch;
    const originalEnv = {
      NODE_ENV: env.NODE_ENV,
      RESEND_API_KEY: env.RESEND_API_KEY,
      EMAIL_FROM: env.EMAIL_FROM,
      APP_WEB_URL: env.APP_WEB_URL,
    };
    const originalError = console.error;
    const originalInfo = console.info;
    let logs = "";
    const secret = "test-resend-key";
    const rawToken = "adapter-error-token";
    const confirmationUrl = "https://app.example.test/confirmar-email?token=adapter-error-token";

    env.NODE_ENV = "test";
    env.RESEND_API_KEY = secret;
    env.EMAIL_FROM = "Guardian <noreply@example.com>";
    env.APP_WEB_URL = "https://app.example.test";
    console.error = (...args: unknown[]) => {
      logs += args.map(String).join(" ");
    };
    console.info = (...args: unknown[]) => {
      logs += args.map(String).join(" ");
    };
    global.fetch = (async () => ({ ok: false, status: 503 }) as Response) as typeof fetch;

    try {
      await assert.rejects(
        new ResendEmailSender().sendEmailVerification({
          to: "jogador@example.com",
          nome: "Jogador",
          confirmationUrl,
          expiresAt: new Date("2026-07-29T12:00:00.000Z"),
        }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.message.includes(secret), false);
          assert.equal(error.message.includes(rawToken), false);
          assert.equal(error.message.includes("confirmar-email"), false);
          assert.equal(error.message.includes("jogador@example.com"), false);
          return error.message === "Email provider rejected verification email with status 503.";
        }
      );

      assert.equal(logs.includes(secret), false);
      assert.equal(logs.includes(rawToken), false);
      assert.equal(logs.includes("confirmar-email"), false);
      assert.equal(logs.includes("jogador@example.com"), false);
    } finally {
      console.error = originalError;
      console.info = originalInfo;
      global.fetch = originalFetch;
      Object.assign(env, originalEnv);
    }
  });

  resetEmailSenderForTests();
  EmailVerificationService.resetDbForTests();
  console.log("Auth tests completed.");
})().catch((error) => {
  resetEmailSenderForTests();
  EmailVerificationService.resetDbForTests();
  console.error(error);
  process.exit(1);
});
