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
  TableMemberRole,
  TableMemberStatus,
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
  throw new Error("TEST_DATABASE_URL nao configurado. O Pacote 02 exige PostgreSQL descartavel dedicado.");
}

if (
  (TEST_DATABASE_URL === process.env.DATABASE_URL ||
    TEST_DATABASE_URL === process.env.DIRECT_URL ||
    !/test|tmp|ci|local/i.test(TEST_DATABASE_URL)) &&
  !isExplicitlyConfirmedDisposableTestDatabase
) {
  throw new Error("TEST_DATABASE_URL parece compartilhado ou nao descartavel. Abortando Pacote 02.");
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "table-package02-test-secret";
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
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
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

const createToken = (id: string, accountRole: "USER" | "ADMIN" = "USER") =>
  jwt.sign({ id, accountRole }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

const requestJson = async (
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
) => {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json();
  return { status: response.status, body, serialized: JSON.stringify(body) };
};

const headers = (userId: string, accountRole: "USER" | "ADMIN" = "USER") => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${createToken(userId, accountRole)}`,
});

void (async () => {
  migrate();

  const prisma = new PrismaClient();
  const runId = `tbl02-${Date.now()}`;
  const ids = {
    master: `${runId}-master`,
    player: `${runId}-player`,
    player2: `${runId}-player2`,
    outsiderMaster: `${runId}-outsider-master`,
    admin: `${runId}-admin`,
    mismatch: `${runId}-mismatch`,
  };

  const { default: tableRoutes } = await import("../table.routes");
  const { default: invitationRoutes } = await import("../tableInvitation.routes");
  const { default: contextRoutes } = await import("../../context/context.routes");
  const { errorHandler } = await import("../../../middleware/errorHandler");
  const { requestContext } = await import("../../../middleware/requestContext");

  const app = express();
  const basePath = `/pkg02-${runId}`;
  app.use(requestContext);
  app.use(express.json());
  app.use(`${basePath}/tables`, tableRoutes);
  app.use(`${basePath}/table-invitations`, invitationRoutes);
  app.use(`${basePath}/context`, contextRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;

  let settingA: any;
  let settingB: any;
  let episodeA: any;
  let episodeB: any;
  let versionA: any;
  let versionB: any;
  let draftVersion: any;
  let archivedVersion: any;
  let invalidLayerVersion: any;
  let publicUnitA: any;
  let playerUnitA: any;
  let masterUnitA: any;
  let characterUnitA: any;
  let spectatorUnitA: any;
  let adminUnitA: any;
  let tableA: any;
  let tableB: any;
  let inviteToken = "";
  let invitation: any;

  const createUser = (id: string, email: string, accountRole: AccountRole = AccountRole.USER) => ({
    id,
    nome: id,
    email,
    senha: "not-used",
    emailVerifiedAt: new Date(),
    accountRole,
  });

  const createVersion = async (
    settingId: string,
    episodeId: string,
    version: number,
    status: ContextVersionStatus,
    layer: ContextLayer = ContextLayer.EPISODE
  ) =>
    prisma.contextVersion.create({
      data: {
        settingId,
        episodeId,
        layer,
        version,
        status,
        origin: `${runId}: contexto ${version}`,
        approvalNote: "Autor/Admin",
        createdById: ids.admin,
        approvedById: status === ContextVersionStatus.PUBLISHED ? ids.admin : null,
        publishedAt: status === ContextVersionStatus.PUBLISHED ? new Date() : null,
        archivedAt: status === ContextVersionStatus.ARCHIVED ? new Date() : null,
      },
    });

  const createUnit = async (
    contextVersionId: string,
    visibility: ContextVisibility,
    classification: ContextClassification,
    title: string,
    content: string
  ) =>
    prisma.contextUnit.create({
      data: {
        contextVersionId,
        visibility,
        classification,
        title: `${runId} ${title}`,
        content,
        createdById: ids.admin,
      },
    });

  try {
    await prisma.user.createMany({
      data: [
        createUser(ids.master, `${ids.master}@example.test`),
        createUser(ids.player, `${ids.player}@example.test`),
        createUser(ids.player2, `${ids.player2}@example.test`),
        createUser(ids.outsiderMaster, `${ids.outsiderMaster}@example.test`),
        createUser(ids.admin, `${ids.admin}@example.test`, AccountRole.ADMIN),
        createUser(ids.mismatch, `${ids.mismatch}@example.test`),
      ],
    });

    settingA = await prisma.setting.create({
      data: { stableKey: `${runId}-setting-a`, title: "Setting A", createdById: ids.admin },
    });
    settingB = await prisma.setting.create({
      data: { stableKey: `${runId}-setting-b`, title: "Setting B", createdById: ids.admin },
    });
    episodeA = await prisma.episode.create({
      data: { settingId: settingA.id, stableKey: `${runId}-episode-a`, title: "Episode A", createdById: ids.admin },
    });
    episodeB = await prisma.episode.create({
      data: { settingId: settingB.id, stableKey: `${runId}-episode-b`, title: "Episode B", createdById: ids.admin },
    });
    versionA = await createVersion(settingA.id, episodeA.id, 1, ContextVersionStatus.PUBLISHED);
    versionB = await createVersion(settingB.id, episodeB.id, 1, ContextVersionStatus.PUBLISHED);
    draftVersion = await createVersion(settingA.id, episodeA.id, 2, ContextVersionStatus.DRAFT);
    archivedVersion = await createVersion(settingA.id, episodeA.id, 3, ContextVersionStatus.ARCHIVED);
    invalidLayerVersion = await createVersion(
      settingA.id,
      episodeA.id,
      4,
      ContextVersionStatus.PUBLISHED,
      ContextLayer.PLAYTEST_VALIDATION
    );
    publicUnitA = await createUnit(versionA.id, ContextVisibility.PUBLIC, ContextClassification.PUBLIC_CANON, "Publico", "publico A");
    playerUnitA = await createUnit(versionA.id, ContextVisibility.AUTHENTICATED_TABLE_PLAYER, ContextClassification.RULE, "Player", "player A");
    masterUnitA = await createUnit(versionA.id, ContextVisibility.TABLE_MASTER, ContextClassification.SECRET_CANON, "Master", "master A");
    characterUnitA = await createUnit(versionA.id, ContextVisibility.SPECIFIC_CHARACTER, ContextClassification.HYPOTHESIS, "Character", "character A");
    spectatorUnitA = await createUnit(versionA.id, ContextVisibility.SPECTATOR, ContextClassification.PUBLIC_CANON, "Spectator", "spectator A");
    adminUnitA = await createUnit(versionA.id, ContextVisibility.AUTHOR_ADMIN, ContextClassification.SECRET_CANON, "Admin", "admin A");
    await createUnit(versionB.id, ContextVisibility.PUBLIC, ContextClassification.PUBLIC_CANON, "Publico B", "publico B");
    await createUnit(versionB.id, ContextVisibility.AUTHENTICATED_TABLE_PLAYER, ContextClassification.RULE, "Player B", "player B");
    await createUnit(versionB.id, ContextVisibility.TABLE_MASTER, ContextClassification.SECRET_CANON, "Master B", "master B");

    await test("1 e 2. Mestre autenticado cria mesa e membership MASTER atomico", async () => {
      const response = await requestJson(`${baseUrl}/tables`, {
        method: "POST",
        headers: headers(ids.master),
        body: {
          name: "Mesa Pacote 02",
          description: "Proposta de playtest",
          settingId: settingA.id,
          episodeId: episodeA.id,
          contextVersionId: versionA.id,
        },
      });
      assert.equal(response.status, 201);
      tableA = response.body.table;
      assert.equal(tableA.currentUserRole, TableMemberRole.MASTER);
      assert.equal(await prisma.table.count({ where: { id: tableA.id, contextVersionId: versionA.id } }), 1);
      assert.equal(
        await prisma.tableMember.count({
          where: { tableId: tableA.id, userId: ids.master, role: TableMemberRole.MASTER, status: TableMemberStatus.ACTIVE },
        }),
        1
      );
    });

    await test("3. Episode de outro Setting e rejeitado", async () => {
      const response = await requestJson(`${baseUrl}/tables`, {
        method: "POST",
        headers: headers(ids.master),
        body: { name: "Invalida", settingId: settingA.id, episodeId: episodeB.id, contextVersionId: versionB.id },
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, "INVALID_SETTING_EPISODE_RELATIONSHIP");
    });

    await test("4. Context draft, archived ou layer invalido nao pode ser atribuido", async () => {
      for (const version of [draftVersion, archivedVersion]) {
        const response = await requestJson(`${baseUrl}/tables`, {
          method: "POST",
          headers: headers(ids.master),
          body: { name: "Contexto invalido", settingId: settingA.id, episodeId: episodeA.id, contextVersionId: version.id },
        });
        assert.equal(response.status, 409);
        assert.equal(response.body.error.code, "TABLE_CONTEXT_NOT_PUBLISHED");
      }

      const invalidLayer = await requestJson(`${baseUrl}/tables`, {
        method: "POST",
        headers: headers(ids.master),
        body: {
          name: "Contexto layer invalido",
          settingId: settingA.id,
          episodeId: episodeA.id,
          contextVersionId: invalidLayerVersion.id,
        },
      });
      assert.equal(invalidLayer.status, 400);
      assert.equal(invalidLayer.body.error.code, "INVALID_TABLE_CONTEXT_VERSION");
    });

    await test("5. Criacao sem autenticacao e rejeitada", async () => {
      const response = await requestJson(`${baseUrl}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { name: "Anonima", settingId: settingA.id, episodeId: episodeA.id, contextVersionId: versionA.id },
      });
      assert.equal(response.status, 401);
    });

    await test("6, 8 e 9. Convite de MASTER guarda so hash e jogador aceita uma vez", async () => {
      const created = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
        method: "POST",
        headers: headers(ids.master),
        body: { email: `${ids.player}@example.test`, role: "PLAYER" },
      });
      assert.equal(created.status, 201);
      inviteToken = created.body.token;
      invitation = await prisma.tableInvitation.findUnique({ where: { id: created.body.invitation.id } });
      assert.ok(inviteToken);
      assert.notEqual(invitation.tokenHash, inviteToken);
      assert.equal(invitation.tokenHash.length, 64);

      const accepted = await requestJson(`${baseUrl}/table-invitations/accept`, {
        method: "POST",
        headers: headers(ids.player),
        body: { token: inviteToken },
      });
      assert.equal(accepted.status, 200);
      assert.equal(
        await prisma.tableMember.count({ where: { tableId: tableA.id, userId: ids.player, status: TableMemberStatus.ACTIVE } }),
        1
      );
    });

    await test("12. Aceite repetido nao duplica membership", async () => {
      const repeated = await requestJson(`${baseUrl}/table-invitations/accept`, {
        method: "POST",
        headers: headers(ids.player),
        body: { token: inviteToken },
      });
      assert.equal(repeated.status, 200);
      assert.equal(
        await prisma.tableMember.count({ where: { tableId: tableA.id, userId: ids.player, status: TableMemberStatus.ACTIVE } }),
        1
      );
    });

    await test("6. PLAYER nao gerencia convites", async () => {
      const response = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
        method: "POST",
        headers: headers(ids.player),
        body: { email: `${ids.player2}@example.test`, role: "PLAYER" },
      });
      assert.equal(response.status, 403);
      assert.equal(response.body.error.code, "TABLE_MASTER_REQUIRED");
    });

    await test("7 e 21. Mestre de outra mesa e ADMIN global isolado nao gerenciam convites", async () => {
      const createB = await requestJson(`${baseUrl}/tables`, {
        method: "POST",
        headers: headers(ids.outsiderMaster),
        body: { name: "Mesa B", settingId: settingB.id, episodeId: episodeB.id, contextVersionId: versionB.id },
      });
      assert.equal(createB.status, 201);
      tableB = createB.body.table;

      for (const actor of [{ id: ids.outsiderMaster, role: "USER" as const }, { id: ids.admin, role: "ADMIN" as const }]) {
        const response = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
          method: "POST",
          headers: headers(actor.id, actor.role),
          body: { email: `${ids.player2}@example.test`, role: "PLAYER" },
        });
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, "TABLE_MEMBER_REQUIRED");
      }
    });

    await test("10. Convite expirado e rejeitado", async () => {
      const token = "expired-token-for-package-02";
      await prisma.tableInvitation.create({
        data: {
          tableId: tableA.id,
          invitedEmail: `${ids.player2}@example.test`,
          intendedRole: TableMemberRole.PLAYER,
          tokenHash: cryptoHash(token),
          expiresAt: new Date(Date.now() - 1_000),
          invitedById: ids.master,
        },
      });
      const response = await requestJson(`${baseUrl}/table-invitations/accept`, {
        method: "POST",
        headers: headers(ids.player2),
        body: { token },
      });
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, "TABLE_INVITATION_EXPIRED");
    });

    await test("11. Convite revogado e rejeitado", async () => {
      const created = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
        method: "POST",
        headers: headers(ids.master),
        body: { email: `${ids.player2}@example.test`, role: "PLAYER" },
      });
      const revoke = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations/${created.body.invitation.id}/revoke`, {
        method: "POST",
        headers: headers(ids.master),
      });
      assert.equal(revoke.status, 200);
      const accepted = await requestJson(`${baseUrl}/table-invitations/accept`, {
        method: "POST",
        headers: headers(ids.player2),
        body: { token: created.body.token },
      });
      assert.equal(accepted.status, 409);
      assert.equal(accepted.body.error.code, "TABLE_INVITATION_NOT_PENDING");
    });

    await test("13. Aceite concorrente nao duplica membership", async () => {
      const created = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
        method: "POST",
        headers: headers(ids.master),
        body: { email: `${ids.player2}@example.test`, role: "PLAYER" },
      });
      const results = await Promise.all([
        requestJson(`${baseUrl}/table-invitations/accept`, { method: "POST", headers: headers(ids.player2), body: { token: created.body.token } }),
        requestJson(`${baseUrl}/table-invitations/accept`, { method: "POST", headers: headers(ids.player2), body: { token: created.body.token } }),
      ]);
      assert.equal(results.every((result) => result.status === 200 || result.status === 409), true);
      assert.equal(
        await prisma.tableMember.count({ where: { tableId: tableA.id, userId: ids.player2, status: TableMemberStatus.ACTIVE } }),
        1
      );
    });

    await test("14. Mismatch de email e rejeitado sem enumerar conta", async () => {
      const created = await requestJson(`${baseUrl}/tables/${tableA.id}/invitations`, {
        method: "POST",
        headers: headers(ids.master),
        body: { email: `email-bound-${runId}@example.test`, role: "PLAYER" },
      });
      const response = await requestJson(`${baseUrl}/table-invitations/accept`, {
        method: "POST",
        headers: headers(ids.mismatch),
        body: { token: created.body.token },
      });
      assert.equal(response.status, 403);
      assert.equal(JSON.stringify(response.body).includes("existe"), false);
      assert.equal(JSON.stringify(response.body).includes(ids.mismatch), false);
    });

    await test("15 a 18 e 20. Context por mesa respeita visibilidade, papel e isolamento", async () => {
      const playerContext = await requestJson(`${baseUrl}/tables/${tableA.id}/context/player`, { headers: headers(ids.player) });
      assert.equal(playerContext.status, 200);
      const playerSerialized = JSON.stringify(playerContext.body);
      assert.equal(playerSerialized.includes(publicUnitA.id), true);
      assert.equal(playerSerialized.includes(playerUnitA.id), true);
      assert.equal(playerSerialized.includes(masterUnitA.id), false);
      assert.equal(playerSerialized.includes(characterUnitA.id), false);
      assert.equal(playerSerialized.includes(spectatorUnitA.id), false);
      assert.equal(playerSerialized.includes(adminUnitA.id), false);
      assert.equal(playerSerialized.includes("SPECIFIC_CHARACTER"), false);
      assert.equal(playerSerialized.includes("SPECTATOR"), false);
      assert.equal(playerSerialized.includes("AUTHOR_ADMIN"), false);

      const playerMasterEndpoint = await requestJson(`${baseUrl}/tables/${tableA.id}/context/master`, { headers: headers(ids.player) });
      assert.equal(playerMasterEndpoint.status, 403);

      const masterContext = await requestJson(`${baseUrl}/tables/${tableA.id}/context/master`, { headers: headers(ids.master) });
      assert.equal(masterContext.status, 200);
      const masterSerialized = JSON.stringify(masterContext.body);
      assert.equal(masterSerialized.includes(masterUnitA.id), true);
      assert.equal(masterSerialized.includes(characterUnitA.id), false);
      assert.equal(masterSerialized.includes(spectatorUnitA.id), false);
      assert.equal(masterSerialized.includes(adminUnitA.id), false);
      assert.equal(masterSerialized.includes("SPECIFIC_CHARACTER"), false);
      assert.equal(masterSerialized.includes("SPECTATOR"), false);
      assert.equal(masterSerialized.includes("AUTHOR_ADMIN"), false);

      const otherMasterContext = await requestJson(`${baseUrl}/tables/${tableA.id}/context/master`, { headers: headers(ids.outsiderMaster) });
      assert.equal(otherMasterContext.status, 403);

      const crossTable = await requestJson(`${baseUrl}/tables/${tableB.id}/context/player`, { headers: headers(ids.player) });
      assert.equal(crossTable.status, 403);
    });

    await test("19. ID direto de Context protegido nao contorna autorizacao", async () => {
      const response = await requestJson(`${baseUrl}/context/units/${masterUnitA.id}/public`);
      assert.equal(response.status, 404);
      assert.equal(response.body.error.code, "NO_ACTIVE_CONTEXT_VERSION");
      assert.equal(JSON.stringify(response.body).includes(masterUnitA.id), false);
    });

    await test("22. Constraints reais de FK e unicidade passam no PostgreSQL", async () => {
      await assert.rejects(
        prisma.tableMember.create({
          data: { tableId: tableA.id, userId: ids.player, role: TableMemberRole.PLAYER, status: TableMemberStatus.ACTIVE },
        }),
        (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      );
      await assert.rejects(
        prisma.table.create({
          data: {
            masterId: ids.master,
            settingId: "setting-ausente",
            episodeId: episodeA.id,
            contextVersionId: versionA.id,
            name: "FK invalida",
            joinCode: `${runId}FK`.slice(0, 12),
          },
        }),
        (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
      );
    });

    console.log("Table Package 02 integration tests completed.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await prisma.tableInvitation.deleteMany({ where: { tableId: { in: [tableA?.id, tableB?.id].filter(Boolean) } } });
    await prisma.tableMember.deleteMany({ where: { tableId: { in: [tableA?.id, tableB?.id].filter(Boolean) } } });
    await prisma.table.deleteMany({ where: { id: { in: [tableA?.id, tableB?.id].filter(Boolean) } } });
    await prisma.contextUnit.deleteMany({ where: { title: { startsWith: runId } } });
    await prisma.contextVersion.deleteMany({ where: { origin: { startsWith: runId } } });
    await prisma.episode.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.setting.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

const cryptoHash = (token: string): string =>
  require("crypto").createHash("sha256").update(token, "utf8").digest("hex");
