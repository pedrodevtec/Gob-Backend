import assert from "node:assert/strict";
import {
  CharacterSheetStatus,
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
  TableMemberRole,
  TableMemberStatus,
} from "@prisma/client";
import { AppError } from "../../../errors/AppError";
import { AiContextService } from "../ai.context.service";

const test = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const now = new Date("2026-07-31T12:00:00.000Z");

const baseState = () => ({
  memberships: [
    {
      id: "member-player-a",
      tableId: "table-a",
      userId: "player-a",
      role: TableMemberRole.PLAYER,
      status: TableMemberStatus.ACTIVE,
    },
    {
      id: "member-player-b",
      tableId: "table-a",
      userId: "player-b",
      role: TableMemberRole.PLAYER,
      status: TableMemberStatus.ACTIVE,
    },
    {
      id: "member-removed",
      tableId: "table-a",
      userId: "removed-player",
      role: TableMemberRole.PLAYER,
      status: TableMemberStatus.REMOVED,
    },
    {
      id: "member-player-c",
      tableId: "table-b",
      userId: "player-c",
      role: TableMemberRole.PLAYER,
      status: TableMemberStatus.ACTIVE,
    },
  ],
  tables: [
    {
      id: "table-a",
      name: "Mesa A",
      settingId: "setting-a",
      episodeId: "episode-a",
      contextVersionId: "version-a-1",
    },
    {
      id: "table-b",
      name: "Mesa B",
      settingId: "setting-b",
      episodeId: "episode-b",
      contextVersionId: "version-b-1",
    },
  ],
  contextVersions: [
    {
      id: "version-a-1",
      settingId: "setting-a",
      episodeId: "episode-a",
      layer: ContextLayer.EPISODE,
      version: 1,
      status: ContextVersionStatus.PUBLISHED,
      units: [
        {
          id: "public-a",
          classification: ContextClassification.PUBLIC_CANON,
          visibility: ContextVisibility.PUBLIC,
          title: "Premissa publica",
          content: "Bravantus esta em risco publico.",
          sortOrder: 1,
          createdAt: now,
        },
        {
          id: "player-a",
          classification: ContextClassification.RULE,
          visibility: ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
          title: "Regra aberta",
          content: "Jogadores podem criar hipoteses.",
          sortOrder: 2,
          createdAt: now,
        },
        {
          id: "secret-a",
          classification: ContextClassification.SECRET_CANON,
          visibility: ContextVisibility.TABLE_MASTER,
          title: "Segredo",
          content: "gm_secret Zurich e Erya ocultos.",
          sortOrder: 3,
          createdAt: now,
        },
        {
          id: "admin-a",
          classification: ContextClassification.SECRET_CANON,
          visibility: ContextVisibility.AUTHOR_ADMIN,
          title: "Author",
          content: "AUTHOR_ADMIN oculto.",
          sortOrder: 4,
          createdAt: now,
        },
      ],
    },
    {
      id: "version-a-2",
      settingId: "setting-a",
      episodeId: "episode-a",
      layer: ContextLayer.EPISODE,
      version: 2,
      status: ContextVersionStatus.PUBLISHED,
      units: [
        {
          id: "newer-a",
          classification: ContextClassification.PUBLIC_CANON,
          visibility: ContextVisibility.PUBLIC,
          title: "Nova versao",
          content: "Conteudo novo que nao esta fixado na mesa.",
          sortOrder: 1,
          createdAt: now,
        },
      ],
    },
    {
      id: "version-b-1",
      settingId: "setting-b",
      episodeId: "episode-b",
      layer: ContextLayer.EPISODE,
      version: 1,
      status: ContextVersionStatus.PUBLISHED,
      units: [
        {
          id: "public-b",
          classification: ContextClassification.PUBLIC_CANON,
          visibility: ContextVisibility.PUBLIC,
          title: "Outra mesa",
          content: "Contexto de outra mesa.",
          sortOrder: 1,
          createdAt: now,
        },
      ],
    },
  ],
  characters: [
    {
      id: "character-a",
      tableId: "table-a",
      userId: "player-a",
      name: "Ayla",
      concept: "Guardiã cautelosa",
      origin: "Fronteira",
      appearance: "Marca visível",
      desire: "Proteger a vila",
      fear: "Falhar",
      promiseOrGuilt: "Promessa antiga",
      reasonToActWithGroup: "Confia no grupo",
      markLocation: "Mao",
      markAppearance: "Linha clara",
      markReaction: "Brilha",
      markAttitude: "Respeita",
      archetypeKey: "guardia-cautelosa",
      attributes: { vigor: 3, foco: 2, presenca: 1, astucia: 2, agilidade: 1, espirito: 3 },
      trainings: ["investigacao", "sobrevivencia", "negociacao"],
      positiveTrait: { text: "Observadora" },
      negativeTrait: { text: "Teimosa" },
      narrativeBond: "Laço próprio",
      personalHistory: "Historia própria.",
      initialEquipment: [{ name: "Kit" }],
      sheetStatus: CharacterSheetStatus.DRAFT,
      sheetRevision: 2,
      episodeAnswers: [
        {
          id: "answer-a",
          questionKey: "vinculo-inicial",
          promptSnapshot: "Pergunta publica",
          answer: "Resposta da Ayla.",
          createdAt: now,
        },
      ],
    },
    {
      id: "character-b",
      tableId: "table-a",
      userId: "player-b",
      name: "Breno",
      concept: "Outro jogador",
      origin: null,
      appearance: null,
      desire: null,
      fear: null,
      promiseOrGuilt: null,
      reasonToActWithGroup: null,
      markLocation: null,
      markAppearance: null,
      markReaction: null,
      markAttitude: null,
      archetypeKey: null,
      attributes: null,
      trainings: null,
      positiveTrait: null,
      negativeTrait: null,
      narrativeBond: null,
      personalHistory: "Nao pode entrar no contexto da Ayla.",
      initialEquipment: null,
      sheetStatus: CharacterSheetStatus.DRAFT,
      sheetRevision: 1,
      episodeAnswers: [{ id: "answer-b", questionKey: "outro", promptSnapshot: null, answer: "Privado B.", createdAt: now }],
    },
    {
      id: "character-c",
      tableId: "table-b",
      userId: "player-c",
      name: "Cora",
      concept: "Outra mesa",
      origin: null,
      appearance: null,
      desire: null,
      fear: null,
      promiseOrGuilt: null,
      reasonToActWithGroup: null,
      markLocation: null,
      markAppearance: null,
      markReaction: null,
      markAttitude: null,
      archetypeKey: null,
      attributes: null,
      trainings: null,
      positiveTrait: null,
      negativeTrait: null,
      narrativeBond: null,
      personalHistory: "Nao pode cruzar mesa.",
      initialEquipment: null,
      sheetStatus: CharacterSheetStatus.DRAFT,
      sheetRevision: 1,
      episodeAnswers: [],
    },
  ],
});

const createFakeDb = (state = baseState()) => ({
  tableMember: {
    findFirst: async ({ where }: any) =>
      state.memberships.find(
        (membership) =>
          membership.tableId === where.tableId &&
          membership.userId === where.userId &&
          membership.status === where.status &&
          membership.role === where.role
      ) ?? null,
  },
  table: {
    findUnique: async ({ where }: any) => {
      const table = state.tables.find((entry) => entry.id === where.id);
      if (!table) return null;
      const contextVersion = state.contextVersions.find((entry) => entry.id === table.contextVersionId);
      if (!contextVersion) return null;
      const allowedVisibilities: ContextVisibility[] = [
        ContextVisibility.PUBLIC,
        ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
      ];
      const units = contextVersion.units
        .filter(
          (unit) =>
            allowedVisibilities.includes(unit.visibility) &&
            unit.classification !== ContextClassification.SECRET_CANON
        )
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
      return { ...table, contextVersion: { ...contextVersion, units } };
    },
  },
  character: {
    findFirst: async ({ where }: any) =>
      state.characters.find(
        (character) =>
          character.id === where.id &&
          character.tableId === where.tableId &&
          character.userId === where.userId
      ) ?? null,
  },
});

const assertNoForbiddenLeak = (value: unknown): void => {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    "gm_secret",
    "SECRET_CANON",
    "TABLE_MASTER",
    "AUTHOR_ADMIN",
    "Zurich",
    "Erya",
    "character-b",
    "answer-b",
    "character-c",
    "version-a-2",
    "newer-a",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `vazou: ${forbidden}`);
  }
};

const assertAppError = async (run: () => Promise<unknown>, code: string): Promise<void> => {
  await assert.rejects(
    run,
    (error: unknown) => error instanceof AppError && error.code === code
  );
};

const main = async () => {
  AiContextService.setDbForTests(createFakeDb() as any);

  await test("Pacote 04 monta contexto de jogador com apenas Context publico/player e personagem proprio", async () => {
    const context = await AiContextService.buildPlayerCharacterContext({
      userId: "player-a",
      tableId: "table-a",
      characterId: "character-a",
      useCase: "PLAYER_CHARACTER_CREATION",
    });

    assert.equal(context.actor.userId, "player-a");
    assert.equal(context.contextVersion.id, "version-a-1");
    assert.deepEqual(context.units.map((unit) => unit.id), ["public-a", "player-a"]);
    assert.equal(context.character?.id, "character-a");
    assert.equal(context.character?.episodeAnswers[0].id, "answer-a");
    assertNoForbiddenLeak(context);
  });

  await test("Pacote 04 rejeita personagem de outro jogador por ID direto", async () => {
    await assertAppError(
      () =>
        AiContextService.buildPlayerCharacterContext({
          userId: "player-a",
          tableId: "table-a",
          characterId: "character-b",
          useCase: "PLAYER_CHARACTER_VALIDATION",
        }),
      "AI_CONTEXT_CHARACTER_NOT_FOUND"
    );
  });

  await test("Pacote 04 rejeita personagem de outra mesa por ID direto", async () => {
    await assertAppError(
      () =>
        AiContextService.buildPlayerCharacterContext({
          userId: "player-a",
          tableId: "table-a",
          characterId: "character-c",
          useCase: "PLAYER_CHARACTER_VALIDATION",
        }),
      "AI_CONTEXT_CHARACTER_NOT_FOUND"
    );
  });

  await test("Pacote 04 rejeita membro removido e ADMIN global sem membership PLAYER", async () => {
    await assertAppError(
      () =>
        AiContextService.buildPlayerCharacterContext({
          userId: "removed-player",
          tableId: "table-a",
          characterId: "character-a",
          useCase: "PLAYER_CHARACTER_CREATION",
        }),
      "AI_CONTEXT_PLAYER_REQUIRED"
    );

    await assertAppError(
      () =>
        AiContextService.buildPlayerCharacterContext({
          userId: "admin-global",
          tableId: "table-a",
          characterId: "character-a",
          useCase: "PLAYER_CHARACTER_CREATION",
        }),
      "AI_CONTEXT_PLAYER_REQUIRED"
    );
  });

  await test("Pacote 04 usa a ContextVersion fixada na mesa mesmo com versao publicada mais nova", async () => {
    const context = await AiContextService.buildPlayerCharacterContext({
      userId: "player-a",
      tableId: "table-a",
      characterId: "character-a",
      useCase: "PLAYER_CHARACTER_VALIDATION",
    });

    assert.equal(context.contextVersion.id, "version-a-1");
    assert.equal(context.sourceRefs.some((source) => source.id === "newer-a"), false);
    assertNoForbiddenLeak(context);
  });

  await test("Pacote 04 bloqueia defensivamente qualquer marcador secreto que chegue ao DTO", async () => {
    const state = baseState();
    state.contextVersions[0].units.push({
      id: "bad-public",
      classification: ContextClassification.PUBLIC_CANON,
      visibility: ContextVisibility.PUBLIC,
      title: "Marcador indevido",
      content: "gm_secret nao deve sair mesmo se catalogado errado.",
      sortOrder: 0,
      createdAt: now,
    });
    AiContextService.setDbForTests(createFakeDb(state) as any);

    await assertAppError(
      () =>
        AiContextService.buildPlayerCharacterContext({
          userId: "player-a",
          tableId: "table-a",
          characterId: "character-a",
          useCase: "PLAYER_CHARACTER_CREATION",
        }),
      "AI_CONTEXT_SECRET_LEAK_BLOCKED"
    );
  });

  AiContextService.resetDbForTests();
  console.log("AI context tests completed.");
};

main().catch((error) => {
  AiContextService.resetDbForTests();
  console.error(error);
  process.exit(1);
});
