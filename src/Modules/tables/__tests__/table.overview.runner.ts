import assert from "node:assert/strict";
import { AppError } from "../../../errors/AppError";
import {
  getListTableCharactersQuery,
  getListTableMissionsQuery,
  getListTableTimelineQuery,
  getListTableSubmissionsQuery,
  validateListTableCharacters,
  validateListTableMissions,
  validateListTableTimeline,
  validateListTableSubmissions,
} from "../table.schema";
import { buildMasterOverviewGuidance } from "../table.overview";

const baseProgress = {
  hasWorldSummary: true,
  hasPlayers: true,
  totalCharacters: 1,
  pendingCharacters: 0,
  totalMissions: 1,
  hasActiveMission: true,
  totalEvents: 1,
  pendingSubmissions: 0,
};

const test = (name: string, run: () => void): void => {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

test("recomenda configurar mundo antes das outras etapas", () => {
  const result = buildMasterOverviewGuidance({
    ...baseProgress,
    hasWorldSummary: false,
  });

  assert.equal(result.nextRecommendedAction.key, "CONFIGURE_WORLD");
  assert.equal(result.onboardingChecklist[0].done, false);
});

test("recomenda revisar personagens pendentes antes de criar missao", () => {
  const result = buildMasterOverviewGuidance({
    ...baseProgress,
    pendingCharacters: 2,
    totalMissions: 0,
    hasActiveMission: false,
  });

  assert.equal(result.nextRecommendedAction.key, "REVIEW_CHARACTERS");
});

test("recomenda criar missao quando nao existe missao ativa", () => {
  const result = buildMasterOverviewGuidance({
    ...baseProgress,
    totalMissions: 0,
    hasActiveMission: false,
  });

  assert.equal(result.nextRecommendedAction.key, "CREATE_FIRST_MISSION");
});

test("recomenda acompanhar submissoes depois do onboarding", () => {
  const result = buildMasterOverviewGuidance({
    ...baseProgress,
    pendingSubmissions: 3,
  });

  assert.equal(result.nextRecommendedAction.key, "FOLLOW_SUBMISSIONS");
});

test("recomenda continuar campanha quando nao ha pendencias", () => {
  const result = buildMasterOverviewGuidance(baseProgress);

  assert.equal(result.nextRecommendedAction.key, "CONTINUE_CAMPAIGN");
  assert.equal(result.onboardingChecklist.every((item) => item.done), true);
});

test("normaliza filtros e paginacao das submissoes agregadas", () => {
  const request = {
    query: {
      status: "submitted",
      cursor: "submission-20",
      limit: "25",
    },
  } as any;

  validateListTableSubmissions(request);

  assert.deepEqual(getListTableSubmissionsQuery(request), {
    status: "SUBMITTED",
    cursor: "submission-20",
    limit: 25,
  });
});

test("usa limite padrao nas submissoes agregadas", () => {
  const request = { query: {} } as any;

  validateListTableSubmissions(request);

  assert.deepEqual(getListTableSubmissionsQuery(request), {
    status: undefined,
    cursor: undefined,
    limit: 20,
  });
});

test("rejeita limite acima do maximo nas submissoes agregadas", () => {
  const request = { query: { limit: "51" } } as any;

  assert.throws(
    () => validateListTableSubmissions(request),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "VALIDATION_ERROR" &&
      error.message === "Campo limit deve estar entre 1 e 50."
  );
});

test("normaliza filtro de review e paginacao de personagens", () => {
  const request = {
    query: {
      reviewStatus: "pending",
      cursor: "character-20",
      limit: "10",
    },
  } as any;

  validateListTableCharacters(request);

  assert.deepEqual(getListTableCharactersQuery(request), {
    reviewStatus: "PENDING",
    cursor: "character-20",
    limit: 10,
  });
});

test("normaliza filtro e paginacao de missoes", () => {
  const request = {
    query: {
      status: "active",
      limit: "50",
    },
  } as any;

  validateListTableMissions(request);

  assert.deepEqual(getListTableMissionsQuery(request), {
    status: "ACTIVE",
    cursor: undefined,
    limit: 50,
  });
});

test("timeline usa paginacao padrao", () => {
  const request = { query: {} } as any;

  validateListTableTimeline(request);

  assert.deepEqual(getListTableTimelineQuery(request), {
    cursor: undefined,
    limit: 20,
  });
});

console.log("Table overview tests completed.");
