import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { AddressInfo } from "node:net";
import {
  AccountRole,
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import express from "express";
import jwt from "jsonwebtoken";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DIRECT_URL = process.env.TEST_DIRECT_URL ?? TEST_DATABASE_URL;
const isExplicitlyConfirmedDisposableTestDatabase =
  process.env.NODE_ENV === "test" &&
  process.env.TEST_DATABASE_CONFIRMED_DISPOSABLE === "true" &&
  Boolean(TEST_DATABASE_URL);

if (!TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL nao configurado. A suite de persistencia real exige um banco PostgreSQL descartavel dedicado."
  );
}

if (
  (TEST_DATABASE_URL === process.env.DATABASE_URL ||
    TEST_DATABASE_URL === process.env.DIRECT_URL ||
    !/test|tmp|ci|local/i.test(TEST_DATABASE_URL)) &&
  !isExplicitlyConfirmedDisposableTestDatabase
) {
  throw new Error(
    "TEST_DATABASE_URL parece apontar para banco compartilhado ou nao descartavel. Abortando suite de persistencia real."
  );
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "context-integration-test-secret";
process.env.NODE_ENV = "test";
process.env.PERMISSION_DEBUG = "false";

const test = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const sanitizeDatabaseOutput = (value: unknown): string => {
  return String(value ?? "")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[connection-string-redigida]")
    .replace(/`[^`]*supabase[^`]*`/gi, "`[destino-redigido]`")
    .replace(/[a-z0-9-]{15,}\.[a-z0-9.-]*supabase\.[a-z.]+/gi, "[host-redigido]")
    .replace(/postgres\.[a-z0-9]+/gi, "postgres.[ref-redigido]");
};

const migrate = (): void => {
  const npx = "npx";
  try {
    execFileSync(npx, ["prisma", "migrate", "deploy"], {
      stdio: "pipe",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        DIRECT_URL: TEST_DIRECT_URL,
      },
    });
  } catch (error) {
    const details =
      error && typeof error === "object"
        ? sanitizeDatabaseOutput(
            [
              "stdout" in error ? (error as { stdout?: unknown }).stdout : "",
              "stderr" in error ? (error as { stderr?: unknown }).stderr : "",
              "message" in error ? (error as { message?: unknown }).message : "",
            ].join("\n")
          )
        : "";
    throw new Error(
      `prisma migrate deploy falhou no banco de teste confirmado.${details ? `\n${details}` : ""}`
    );
  }
};

const createToken = (id: string, accountRole: "USER" | "ADMIN") => {
  return jwt.sign({ id, accountRole }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
};

const requestJson = async (
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
) => {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
};

const assertNoProtectedLeak = (body: unknown, protectedValues: string[] = []): void => {
  const serialized = JSON.stringify(body);
  const forbidden = [
    "AUTHENTICATED_TABLE_PLAYER",
    "SPECIFIC_CHARACTER",
    "TABLE_MASTER",
    "AUTHOR_ADMIN",
    "SECRET_CANON",
    "Contexto para jogador autenticado",
    "Contexto para personagem especifico",
    "Contexto para Mestre",
    "Contexto Author/Admin",
    "Zurich",
    "Erya",
    "approvalNote",
    "approvedById",
    "origin",
    "protectedCount",
    "secretCount",
    ...protectedValues,
  ].filter(Boolean);

  for (const value of forbidden) {
    assert.equal(serialized.includes(value), false, `Resposta publica vazou: ${value}`);
  }
};

void (async () => {
  migrate();

  const prisma = new PrismaClient();
  const runId = `ctx-${Date.now()}`;
  const adminId = `${runId}-admin`;
  const playerId = `${runId}-player`;

  try {
    const { default: contextRoutes } = await import("../context.routes");
    const { errorHandler } = await import("../../../middleware/errorHandler");
    const { requestContext } = await import("../../../middleware/requestContext");

    const app = express();
    const basePath = `/integration-${runId}`;
    app.use(requestContext);
    app.use(express.json());
    app.use(basePath, contextRoutes);
    app.use(errorHandler);
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;
    const adminHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${createToken(adminId, "ADMIN")}`,
    };
    const playerHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${createToken(playerId, "USER")}`,
    };

    await prisma.contextUnit.deleteMany({ where: { title: { startsWith: runId } } });
    await prisma.contextVersion.deleteMany({ where: { origin: { startsWith: runId } } });
    await prisma.episode.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.setting.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, playerId] } } });

    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          nome: "Admin Contexto",
          email: `${adminId}@example.test`,
          senha: "not-used",
          accountRole: AccountRole.ADMIN,
          emailVerifiedAt: new Date(),
        },
        {
          id: playerId,
          nome: "Player Contexto",
          email: `${playerId}@example.test`,
          senha: "not-used",
          accountRole: AccountRole.USER,
          emailVerifiedAt: new Date(),
        },
      ],
    });

    let setting: any;
    let episode: any;
    let version: any;
    let publicUnit: any;
    let authPlayerUnit: any;
    let characterUnit: any;
    let masterUnit: any;
    let adminUnit: any;

    await test("HTTP real cria Setting e Episode persistidos", async () => {
      const settingResponse = await requestJson(`${baseUrl}/admin/settings`, {
        method: "POST",
        headers: adminHeaders,
        body: { stableKey: `${runId}-setting`, title: "Setting Integracao" },
      });
      assert.equal(settingResponse.status, 201);
      setting = settingResponse.body.setting;

      const episodeResponse = await requestJson(`${baseUrl}/admin/episodes`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          settingId: setting.id,
          stableKey: `${runId}-episode`,
          title: "Titulo de trabalho mutavel",
        },
      });
      assert.equal(episodeResponse.status, 201);
      episode = episodeResponse.body.episode;

      assert.equal(await prisma.setting.count({ where: { id: setting.id } }), 1);
      assert.equal(await prisma.episode.count({ where: { id: episode.id, settingId: setting.id } }), 1);
    });

    await test("constraints reais de FK Setting/Episode funcionam", async () => {
      await assert.rejects(
        prisma.episode.create({
          data: {
            settingId: `${runId}-missing-setting`,
            stableKey: `${runId}-bad-fk`,
            title: "Falha FK",
            createdById: adminId,
          },
        }),
        (error: unknown) =>
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
      );
    });

    await test("constraints reais de unicidade funcionam", async () => {
      const duplicateSetting = await requestJson(`${baseUrl}/admin/settings`, {
        method: "POST",
        headers: adminHeaders,
        body: { stableKey: `${runId}-setting`, title: "Duplicado" },
      });
      assert.equal(duplicateSetting.status, 409);
      assert.equal(duplicateSetting.body.error.code, "DUPLICATED_STABLE_IDENTIFIER");
    });

    await test("cria versao publicada com unidades protegidas persistidas separadamente", async () => {
      const versionResponse = await requestJson(`${baseUrl}/admin/versions`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          settingId: setting.id,
          episodeId: episode.id,
          layer: ContextLayer.EPISODE,
          version: 1,
          origin: `${runId}: documento de teste`,
          approvalNote: "Autor/Admin",
        },
      });
      assert.equal(versionResponse.status, 201);
      version = versionResponse.body.contextVersion;

      const createUnit = async (visibility: ContextVisibility, classification: ContextClassification, title: string, content: string) => {
        const response = await requestJson(`${baseUrl}/admin/units`, {
          method: "POST",
          headers: adminHeaders,
          body: {
            contextVersionId: version.id,
            visibility,
            classification,
            title: `${runId} ${title}`,
            content,
          },
        });
        assert.equal(response.status, 201);
        return response.body.contextUnit;
      };

      publicUnit = await createUnit(
        ContextVisibility.PUBLIC,
        ContextClassification.PUBLIC_CANON,
        "Publico",
        "Conteudo publico publicado."
      );
      authPlayerUnit = await createUnit(
        ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
        ContextClassification.RULE,
        "Contexto para jogador autenticado",
        "Conteudo protegido para jogador autenticado de mesa."
      );
      characterUnit = await createUnit(
        ContextVisibility.SPECIFIC_CHARACTER,
        ContextClassification.HYPOTHESIS,
        "Contexto para personagem especifico",
        "Conteudo protegido para personagem especifico."
      );
      masterUnit = await createUnit(
        ContextVisibility.TABLE_MASTER,
        ContextClassification.HYPOTHESIS,
        "Contexto para Mestre",
        "Conteudo protegido para Mestre."
      );
      adminUnit = await createUnit(
        ContextVisibility.AUTHOR_ADMIN,
        ContextClassification.SECRET_CANON,
        "Contexto Author/Admin",
        "Zurich e Erya ficam restritos ao Autor/Admin."
      );

      const publish = await requestJson(`${baseUrl}/admin/versions/${version.id}/publish`, {
        method: "POST",
        headers: adminHeaders,
      });
      assert.equal(publish.status, 200);
      assert.equal(publish.body.contextVersion.status, ContextVersionStatus.PUBLISHED);
      assert.equal(await prisma.contextUnit.count({ where: { contextVersionId: version.id } }), 5);
    });

    await test("anonimo recupera apenas PUBLIC publicado", async () => {
      const response = await requestJson(`${baseUrl}/settings/${setting.stableKey}/episodes/${episode.stableKey}/active-public`);
      assert.equal(response.status, 200);
      assert.equal(response.body.context.units.length, 1);
      assert.equal(response.body.context.units[0].id, publicUnit.id);
      assertNoProtectedLeak(response.body, [
        authPlayerUnit.id,
        characterUnit.id,
        masterUnit.id,
        adminUnit.id,
      ]);
    });

    await test("IDs diretos de unidade e versao protegidas nao enumeram registros", async () => {
      for (const unit of [authPlayerUnit, characterUnit, masterUnit, adminUnit]) {
        const response = await requestJson(`${baseUrl}/units/${unit.id}/public`);
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
        assertNoProtectedLeak(response.body, [unit.id]);
      }

      const protectedVersion = await requestJson(`${baseUrl}/admin/versions`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          settingId: setting.id,
          episodeId: episode.id,
          layer: ContextLayer.EPISODE,
          version: 2,
          origin: `${runId}: versao protegida`,
          approvalNote: "Autor/Admin",
        },
      });
      const directVersion = await requestJson(`${baseUrl}/versions/${protectedVersion.body.contextVersion.id}/public`);
      assert.equal(directVersion.status, 404);
      assert.equal(directVersion.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
      assertNoProtectedLeak(directVersion.body, [protectedVersion.body.contextVersion.id]);
    });

    await test("draft e archived nao retornam como contexto publico ativo", async () => {
      const draftActive = await requestJson(`${baseUrl}/settings/${setting.stableKey}/episodes/${episode.stableKey}/active-public`);
      assert.equal(draftActive.status, 200);
      assert.equal(draftActive.body.context.version, 1);

      const archive = await requestJson(`${baseUrl}/admin/versions/${version.id}/archive`, {
        method: "POST",
        headers: adminHeaders,
      });
      assert.equal(archive.status, 200);

      const afterArchive = await requestJson(`${baseUrl}/settings/${setting.stableKey}/episodes/${episode.stableKey}/active-public`);
      assert.equal(afterArchive.status, 404);
      assert.equal(afterArchive.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
    });

    await test("publicada nao edita, versao subsequente preserva historico e archive nao deleta", async () => {
      const editPublished = await requestJson(`${baseUrl}/admin/units`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          contextVersionId: version.id,
          visibility: ContextVisibility.PUBLIC,
          classification: ContextClassification.PUBLIC_CANON,
          title: `${runId} edicao indevida`,
          content: "Nao pode persistir.",
        },
      });
      assert.equal(editPublished.status, 409);
      assert.equal(editPublished.body.error.code, "CONTEXT_VERSION_IMMUTABLE");

      const version3 = await requestJson(`${baseUrl}/admin/versions`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          settingId: setting.id,
          episodeId: episode.id,
          layer: ContextLayer.EPISODE,
          version: 3,
          origin: `${runId}: nova versao`,
          approvalNote: "Autor/Admin",
        },
      });
      assert.equal(version3.status, 201);
      assert.equal(await prisma.contextVersion.count({ where: { id: version.id } }), 1);
      assert.equal(await prisma.contextVersion.count({ where: { id: version3.body.contextVersion.id } }), 1);
      assert.equal(
        (await prisma.contextVersion.findUnique({ where: { id: version.id } }))?.status,
        ContextVersionStatus.ARCHIVED
      );
    });

    await test("unicidade real de versao funciona", async () => {
      const duplicateVersion = await requestJson(`${baseUrl}/admin/versions`, {
        method: "POST",
        headers: adminHeaders,
        body: {
          settingId: setting.id,
          episodeId: episode.id,
          layer: ContextLayer.EPISODE,
          version: 3,
          origin: `${runId}: duplicada`,
          approvalNote: "Autor/Admin",
        },
      });
      assert.equal(duplicateVersion.status, 409);
      assert.equal(duplicateVersion.body.error.code, "INVALID_CONTEXT_VERSION");
    });

    await test("usuario comum nao acessa listagem administrativa", async () => {
      const response = await requestJson(`${baseUrl}/admin/versions`, {
        headers: playerHeaders,
      });
      assert.equal(response.status, 403);
      assert.equal(response.body.error.code, "ADMIN_REQUIRED");
      assertNoProtectedLeak(response.body);
    });

    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    console.log("Context integration tests completed.");
  } finally {
    await prisma.contextUnit.deleteMany({ where: { title: { startsWith: runId } } });
    await prisma.contextVersion.deleteMany({ where: { origin: { startsWith: runId } } });
    await prisma.episode.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.setting.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, playerId] } } });
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
