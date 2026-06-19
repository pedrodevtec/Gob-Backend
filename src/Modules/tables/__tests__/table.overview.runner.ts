import assert from "node:assert/strict";
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

console.log("Table overview tests completed.");
