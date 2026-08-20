import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { AddressInfo } from "node:net";
import {
  AccountRole,
  CharacterReviewAction,
  CharacterSheetStatus,
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
  Prisma,
  PrismaClient,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
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
  throw new Error("TEST_DATABASE_URL nao configurado. O Pacote 03 exige PostgreSQL descartavel dedicado.");
}

if (
  (TEST_DATABASE_URL === process.env.DATABASE_URL ||
    TEST_DATABASE_URL === process.env.DIRECT_URL ||
    !/test|tmp|ci|local/i.test(TEST_DATABASE_URL)) &&
  !isExplicitlyConfirmedDisposableTestDatabase
) {
  throw new Error("TEST_DATABASE_URL parece compartilhado ou nao descartavel. Abortando Pacote 03.");
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "table-package03-test-secret";
process.env.NODE_ENV = "test";
process.env.PERMISSION_DEBUG = "false";

const sanitizeDatabaseOutput = (value: unknown): string =>
  String(value ?? "")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[connection-string-redigida]")
    .replace(/`[^`]*supabase[^`]*`/gi, "`[destino-redigido]`")
    .replace(/[a-z0-9-]{15,}\.[a-z0-9.-]*supabase\.[a-z.]+/gi, "[host-redigido]")
    .replace(/postgres\.[a-z0-9]+/gi, "postgres.[ref-redigido]");

const migrate = (): void => {
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "pipe",
      shell: process.platform === "win32",
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DIRECT_URL },
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
    throw new Error(`prisma migrate deploy falhou no banco de teste confirmado.${details ? `\n${details}` : ""}`);
  }
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

const createToken = (id: string, accountRole: "USER" | "ADMIN" = "USER") =>
  jwt.sign({ id, accountRole }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

const headers = (userId: string, accountRole: "USER" | "ADMIN" = "USER") => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${createToken(userId, accountRole)}`,
});

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

const validSheet = () => ({
  name: "Ayla",
  concept: "Guardia em formacao",
  origin: "Vila de fronteira",
  appearance: "Olhar atento e roupas gastas",
  desire: "Proteger sua comunidade",
  fear: "Falhar quando alguem depender dela",
  promiseOrGuilt: "Prometeu voltar para casa",
  reasonToActWithGroup: "Sabe que sozinha nao resolve a crise",
  markLocation: "Mao esquerda",
  markAppearance: "Linhas prateadas",
  markReaction: "Aquece perto de perigo",
  markAttitude: "Desconfia da propria marca",
  archetypeKey: "guardian_blade",
  attributes: {
    strength: 2,
    agility: 2,
    vigor: 2,
    intellect: 2,
    presence: 2,
    spirit: 2,
  },
  trainings: ["investigation", "survival", "influence"],
  positiveTrait: { text: "Observadora" },
  negativeTrait: { text: "Teimosa" },
  narrativeBond: "Confia no grupo por necessidade",
  personalHistory: "Cresceu ouvindo relatos contraditorios sobre os Guardioes.",
  initialEquipment: [{ slot: "main_hand", name: "faca simples" }],
});

const validEpisodeAnswers = () => ({
  answers: [
    { questionKey: "relationship_with_erya", answer: "Erya ajudou Ayla a entender o risco da Marca." },
    { questionKey: "protection_in_bravantus", answer: "Ayla quer proteger os aprendizes do portao oeste." },
    { questionKey: "past_connection_to_mandukuru", answer: "Ela viu sinais de Mandukuru antes do ataque." },
    { questionKey: "fear_of_guardian_souls", answer: "Ela teme perder a propria vontade para uma alma antiga." },
  ],
});

const assertNoSpoilerLeak = (value: unknown): void => {
  const serialized = JSON.stringify(value);
  for (const forbidden of ["Zurich", "TABLE_MASTER", "AUTHOR_ADMIN", "SECRET_CANON"]) {
    assert.equal(serialized.includes(forbidden), false, `Vazamento proibido: ${forbidden}`);
  }
};

void (async () => {
  migrate();
  const prisma = new PrismaClient();
  const runId = `chr03-${Date.now()}`;
  const ids = {
    masterA: `${runId}-master-a`,
    playerA: `${runId}-player-a`,
    playerB: `${runId}-player-b`,
    removed: `${runId}-removed`,
    masterB: `${runId}-master-b`,
    outsider: `${runId}-outsider`,
    admin: `${runId}-admin`,
  };

  const { default: tableRoutes } = await import("../table.routes");
  const { errorHandler } = await import("../../../middleware/errorHandler");
  const { requestContext } = await import("../../../middleware/requestContext");

  const app = express();
  const basePath = `/pkg03-${runId}`;
  app.use(requestContext);
  app.use(express.json());
  app.use(`${basePath}/tables`, tableRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;

  let tableA: any;
  let tableB: any;
  let characterA: any;
  let characterB: any;
  let reviewCharacter: any;
  let legacyCharacter: any;
  let legacyClass: any;

  try {
    await prisma.user.createMany({
      data: [
        { id: ids.masterA, nome: "Master A", email: `${ids.masterA}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.playerA, nome: "Player A", email: `${ids.playerA}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.playerB, nome: "Player B", email: `${ids.playerB}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.removed, nome: "Removed", email: `${ids.removed}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.masterB, nome: "Master B", email: `${ids.masterB}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.outsider, nome: "Outsider", email: `${ids.outsider}@example.test`, senha: "x", emailVerifiedAt: new Date() },
        { id: ids.admin, nome: "Admin", email: `${ids.admin}@example.test`, senha: "x", emailVerifiedAt: new Date(), accountRole: AccountRole.ADMIN },
      ],
    });

    legacyClass = await prisma.class.create({
      data: {
        name: `${runId}-compat-class`,
        modifier: "VIG",
        description: "Classe tecnica para compatibilidade do schema legado.",
        tier: 1,
      },
    });

    const setting = await prisma.setting.create({
      data: { stableKey: `${runId}-setting`, title: "Setting", createdById: ids.admin },
    });
    const episode = await prisma.episode.create({
      data: { settingId: setting.id, stableKey: `${runId}-episode`, title: "Episode", createdById: ids.admin },
    });
    const version = await prisma.contextVersion.create({
      data: {
        settingId: setting.id,
        episodeId: episode.id,
        layer: ContextLayer.EPISODE,
        version: 1,
        status: ContextVersionStatus.PUBLISHED,
        origin: `${runId}: contexto`,
        approvalNote: "Autor/Admin",
        createdById: ids.admin,
        approvedById: ids.admin,
        publishedAt: new Date(),
      },
    });
    await prisma.contextUnit.createMany({
      data: [
        {
          contextVersionId: version.id,
          classification: ContextClassification.PUBLIC_CANON,
          visibility: ContextVisibility.PUBLIC,
          title: `${runId} Public`,
          content: "Contexto publico",
          createdById: ids.admin,
        },
        {
          contextVersionId: version.id,
          classification: ContextClassification.SECRET_CANON,
          visibility: ContextVisibility.TABLE_MASTER,
          title: `${runId} Master`,
          content: "Zurich e Erya seguem ocultos",
          createdById: ids.admin,
        },
      ],
    });

    tableA = await prisma.table.create({
      data: {
        masterId: ids.masterA,
        settingId: setting.id,
        episodeId: episode.id,
        contextVersionId: version.id,
        name: `${runId} mesa A`,
        joinCode: `${runId.slice(-4)}A1`.toUpperCase(),
        status: TableStatus.RECRUITING,
        members: {
          create: [
            { userId: ids.masterA, role: TableMemberRole.MASTER, status: TableMemberStatus.ACTIVE },
            { userId: ids.playerA, role: TableMemberRole.PLAYER, status: TableMemberStatus.ACTIVE },
            { userId: ids.playerB, role: TableMemberRole.PLAYER, status: TableMemberStatus.ACTIVE },
            { userId: ids.removed, role: TableMemberRole.PLAYER, status: TableMemberStatus.REMOVED },
          ],
        },
      },
    });
    tableB = await prisma.table.create({
      data: {
        masterId: ids.masterB,
        settingId: setting.id,
        episodeId: episode.id,
        contextVersionId: version.id,
        name: `${runId} mesa B`,
        joinCode: `${runId.slice(-4)}B1`.toUpperCase(),
        status: TableStatus.RECRUITING,
        members: { create: { userId: ids.masterB, role: TableMemberRole.MASTER, status: TableMemberStatus.ACTIVE } },
      },
    });

    await test("1. PLAYER ativo cria DRAFT proprio", async () => {
      const anonymous = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { name: "Anonimo" },
      });
      assert.equal(anonymous.status, 401);

      const response = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.playerA),
        body: { name: "Ayla" },
      });
      assert.equal(response.status, 201);
      characterA = response.body.character;
      assert.equal(characterA.ownerUserId, ids.playerA);
      assert.equal(characterA.sheetStatus, CharacterSheetStatus.DRAFT);
      assertNoSpoilerLeak(response.body);
    });

    await test("2 a 5. Membership, removido e ownership enviado pelo cliente sao bloqueados", async () => {
      const masterCreate = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: { name: "Master char" },
      });
      assert.equal(masterCreate.status, 403);

      const outsideCreate = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.outsider),
        body: { name: "Outsider char" },
      });
      assert.equal(outsideCreate.status, 403);

      const removedCreate = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.removed),
        body: { name: "Removed char" },
      });
      assert.equal(removedCreate.status, 403);

      const forgedOwner = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.playerA),
        body: { name: "Forjado", ownerUserId: ids.playerB },
      });
      assert.equal(forgedOwner.status, 400);
      assert.equal(forgedOwner.body.error.code, "FORBIDDEN_CHARACTER_FIELD");
    });

    await test("6 e 7. Draft incompleto salva e submissao incompleta falha", async () => {
      const me = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/me`, { headers: headers(ids.playerA) });
      assert.equal(me.status, 200);
      assert.equal(me.body.character.id, characterA.id);
      assert.equal(me.body.character.journeyProgress.currentMilestone, "CHARACTER_STARTED");
      assert.equal(me.body.character.journeyProgress.nextMilestone, "IDENTITY_COMPLETED");

      const submit = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/submit`, {
        method: "POST",
        headers: headers(ids.playerA),
      });
      assert.equal(submit.status, 400);
      assert.equal(submit.body.error.code, "CHARACTER_SHEET_INCOMPLETE");
      assert.equal(
        await prisma.characterSubmissionSnapshot.count({ where: { characterId: characterA.id } }),
        0
      );
    });

    await test("27, 28, 29 e 30. Respostas, derivados e atributos invalidos sao protegidos", async () => {
      const duplicateAnswers = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/episode-answers`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: {
          answers: [
            { questionKey: "relationship_with_erya", answer: "A" },
            { questionKey: "relationship_with_erya", answer: "B" },
          ],
        },
      });
      assert.equal(duplicateAnswers.status, 409);

      const otherAnswer = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/episode-answers`, {
        method: "PATCH",
        headers: headers(ids.playerB),
        body: { answers: [{ questionKey: "relationship_with_erya", answer: "Nao pode" }] },
      });
      assert.equal(otherAnswer.status, 404);

      const forgedDerived = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: { positiveTrait: { text: "Forte", derivedBonus: 99 } },
      });
      assert.equal(forgedDerived.status, 400);
      assert.equal(forgedDerived.body.error.code, "FORGED_DERIVED_VALUES");

      const invalidAttributes = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: { attributes: { "nome inseguro!": 1, a: 1, b: 1, c: 1, d: 1, e: 1 } },
      });
      assert.equal(invalidAttributes.status, 400);
      assert.equal(invalidAttributes.body.error.code, "INVALID_CHARACTER_ATTRIBUTES");
    });

    await test("8 e 9. Ficha valida submete e SUBMITTED nao edita", async () => {
      const update = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: validSheet(),
      });
      assert.equal(update.status, 200);
      const answers = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/episode-answers`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: validEpisodeAnswers(),
      });
      assert.equal(answers.status, 200);
      assert.equal(answers.body.character.derivedResources.hp, 18);
      assert.equal(answers.body.character.derivedResources.energy, 10);
      assert.equal(answers.body.character.derivedResources.ascensionPoints, 4);
      const submit = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/submit`, {
        method: "POST",
        headers: headers(ids.playerA),
      });
      assert.equal(submit.status, 200);
      assert.equal(submit.body.character.sheetStatus, CharacterSheetStatus.SUBMITTED);
      assert.equal(submit.body.character.journeyProgress.currentMilestone, "CHARACTER_SUBMITTED");
      assert.equal(submit.body.character.journeyProgress.nextMilestone, "CHARACTER_APPROVED");
      assert.equal(submit.body.character.latestSubmission.sheetRevision, submit.body.character.submittedRevision);
      assert.equal(
        await prisma.characterSubmissionSnapshot.count({ where: { characterId: characterA.id } }),
        1
      );
      const firstSnapshot = await prisma.characterSubmissionSnapshot.findFirstOrThrow({
        where: { characterId: characterA.id },
      });
      assert.equal((firstSnapshot.episodeAnswersSnapshot as any[]).length, 4);

      const editSubmitted = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: { concept: "Nao pode" },
      });
      assert.equal(editSubmitted.status, 409);
    });

    await test("10 a 16. Review e request changes respeitam papel, mesa e auditoria", async () => {
      const masterRead = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, { headers: headers(ids.masterA) });
      assert.equal(masterRead.status, 200);
      assertNoSpoilerLeak(masterRead.body);

      const selfApprove = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/approve`, {
        method: "POST",
        headers: headers(ids.playerA),
        body: {},
      });
      assert.equal(selfApprove.status, 403);

      const playerReviewOther = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/request-changes`, {
        method: "POST",
        headers: headers(ids.playerB),
        body: { reason: "Nao pode" },
      });
      assert.equal(playerReviewOther.status, 403);

      const otherMasterRead = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, { headers: headers(ids.masterB) });
      assert.equal(otherMasterRead.status, 403);

      const adminReview = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/request-changes`, {
        method: "POST",
        headers: headers(ids.admin, "ADMIN"),
        body: { reason: "Admin global nao pode" },
      });
      assert.equal(adminReview.status, 403);

      const noReason = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/request-changes`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: {},
      });
      assert.equal(noReason.status, 400);

      const changes = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/request-changes`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: { reason: "Ajustar promessa." },
      });
      assert.equal(changes.status, 200);
      assert.equal(changes.body.character.sheetStatus, CharacterSheetStatus.CHANGES_REQUESTED);
      assert.equal(
        await prisma.characterReviewEvent.count({ where: { characterId: characterA.id, action: CharacterReviewAction.CHANGES_REQUESTED } }),
        1
      );
    });

    await test("17 a 22. Edicao, resubmissao, stale review, aprovacao e repeticao", async () => {
      const before = await prisma.character.findUniqueOrThrow({ where: { id: characterA.id } });
      const edit = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: { promiseOrGuilt: "Prometeu voltar e contar a verdade." },
      });
      assert.equal(edit.status, 200);
      assert.equal(edit.body.character.sheetRevision, before.sheetRevision + 1);
      const submit = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/submit`, {
        method: "POST",
        headers: headers(ids.playerA),
      });
      assert.equal(submit.status, 200);
      assert.equal(submit.body.character.submittedRevision, submit.body.character.sheetRevision);
      assert.equal(
        await prisma.characterSubmissionSnapshot.count({ where: { characterId: characterA.id } }),
        2
      );

      const stale = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/approve`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: { expectedRevision: before.sheetRevision },
      });
      assert.equal(stale.status, 409);

      const approve = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/approve`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: { expectedRevision: submit.body.character.submittedRevision },
      });
      assert.equal(approve.status, 200);
      assert.equal(approve.body.character.sheetStatus, CharacterSheetStatus.APPROVED);
      assert.equal(approve.body.character.approvedSubmission.sheetRevision, submit.body.character.submittedRevision);
      assert.equal(
        await prisma.characterSubmissionSnapshot.count({
          where: { characterId: characterA.id, approvedAt: { not: null } },
        }),
        1
      );
      assert.equal(
        await prisma.characterReviewEvent.count({ where: { characterId: characterA.id, action: CharacterReviewAction.APPROVED } }),
        1
      );

      const editApproved = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}`, {
        method: "PATCH",
        headers: headers(ids.playerA),
        body: { fear: "Nao pode editar" },
      });
      assert.equal(editApproved.status, 409);

      const repeated = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterA.id}/approve`, {
        method: "POST",
        headers: headers(ids.masterA),
        body: {},
      });
      assert.equal(repeated.status, 409);
      assert.equal(
        await prisma.characterReviewEvent.count({ where: { characterId: characterA.id, action: CharacterReviewAction.APPROVED } }),
        1
      );
    });

    await test("23. Aprovacao concorrente gera um resultado final valido", async () => {
      const created = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.playerB),
        body: validSheet(),
      });
      assert.equal(created.status, 201);
      reviewCharacter = created.body.character;
      await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${reviewCharacter.id}/episode-answers`, {
        method: "PATCH",
        headers: headers(ids.playerB),
        body: validEpisodeAnswers(),
      });
      const submitted = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${reviewCharacter.id}/submit`, {
        method: "POST",
        headers: headers(ids.playerB),
      });
      assert.equal(submitted.status, 200);

      const results = await Promise.all([
        requestJson(`${baseUrl}/tables/${tableA.id}/characters/${reviewCharacter.id}/approve`, {
          method: "POST",
          headers: headers(ids.masterA),
          body: { expectedRevision: submitted.body.character.submittedRevision },
        }),
        requestJson(`${baseUrl}/tables/${tableA.id}/characters/${reviewCharacter.id}/approve`, {
          method: "POST",
          headers: headers(ids.masterA),
          body: { expectedRevision: submitted.body.character.submittedRevision },
        }),
      ]);
      assert.equal(results.filter((result) => result.status === 200).length, 1);
      assert.equal(results.filter((result) => result.status === 409).length, 1);
      assert.equal(
        await prisma.characterReviewEvent.count({ where: { characterId: reviewCharacter.id, action: CharacterReviewAction.APPROVED } }),
        1
      );
    });

    await test("24 a 26. ID direto, draft privado e isolamento de tabela", async () => {
      const draft = await requestJson(`${baseUrl}/tables/${tableA.id}/characters`, {
        method: "POST",
        headers: headers(ids.playerA),
        body: { name: "Draft privado" },
      });
      assert.equal(draft.status, 201);
      characterB = draft.body.character;

      const otherPlayerRead = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterB.id}`, {
        headers: headers(ids.playerB),
      });
      assert.equal(otherPlayerRead.status, 404);

      const masterDraftRead = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${characterB.id}`, {
        headers: headers(ids.masterA),
      });
      assert.equal(masterDraftRead.status, 404);

      const wrongTable = await requestJson(`${baseUrl}/tables/${tableB.id}/characters/${characterB.id}`, {
        headers: headers(ids.playerA),
      });
      assert.equal(wrongTable.status, 403);
    });

    await test("31 e 32. characters/me retorna ficha completa e personagem antigo continua legivel", async () => {
      const me = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/me`, { headers: headers(ids.playerA) });
      assert.equal(me.status, 200);
      assert.equal(me.body.character.id, characterB.id);
      assert.equal(me.body.character.editable, true);
      assert.equal(me.body.character.latestSubmission, null);
      assert.equal(me.body.character.approvedSubmission, null);

      legacyCharacter = await prisma.character.create({
        data: {
          userId: ids.playerB,
          tableId: tableA.id,
          name: "Legado antigo",
          classId: legacyClass.id,
          creativeDossier: { soulLegacy: "Nao converter", positiveEcho: "Nao converter" },
        },
      });
      const legacyRead = await requestJson(`${baseUrl}/tables/${tableA.id}/characters/${legacyCharacter.id}`, {
        headers: headers(ids.playerB),
      });
      assert.equal(legacyRead.status, 200);
      assert.deepEqual(legacyRead.body.character.creativeDossier, {
        soulLegacy: "Nao converter",
        positiveEcho: "Nao converter",
      });
    });

    await test("33. PostgreSQL exercita FKs e unicidade de answers", async () => {
      await assert.rejects(
        prisma.characterEpisodeAnswer.create({
          data: { characterId: "ausente", questionKey: "x", answer: "falha" },
        }),
        (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
      );
      await prisma.characterEpisodeAnswer.create({
        data: { characterId: characterB.id, questionKey: "unica", answer: "A" },
      });
      await assert.rejects(
        prisma.characterEpisodeAnswer.create({
          data: { characterId: characterB.id, questionKey: "unica", answer: "B" },
        }),
        (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
      );
    });

    console.log("Table Package 03 integration tests completed.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    const characterIds = [characterA?.id, characterB?.id, reviewCharacter?.id, legacyCharacter?.id].filter(Boolean);
    await prisma.characterSubmissionSnapshot.deleteMany({ where: { characterId: { in: characterIds } } });
    await prisma.characterReviewEvent.deleteMany({ where: { characterId: { in: characterIds } } });
    await prisma.characterEpisodeAnswer.deleteMany({ where: { characterId: { in: characterIds } } });
    await prisma.characterReview.deleteMany({ where: { characterId: { in: characterIds } } });
    await prisma.character.deleteMany({ where: { id: { in: characterIds } } });
    await prisma.tableMember.deleteMany({ where: { tableId: { in: [tableA?.id, tableB?.id].filter(Boolean) } } });
    await prisma.table.deleteMany({ where: { id: { in: [tableA?.id, tableB?.id].filter(Boolean) } } });
    await prisma.contextUnit.deleteMany({ where: { title: { startsWith: runId } } });
    await prisma.contextVersion.deleteMany({ where: { origin: { startsWith: runId } } });
    await prisma.episode.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.setting.deleteMany({ where: { stableKey: { startsWith: runId } } });
    await prisma.class.deleteMany({ where: { id: legacyClass?.id } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
