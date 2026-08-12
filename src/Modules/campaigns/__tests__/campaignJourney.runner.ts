import assert from "node:assert/strict";
import { CharacterSheetStatus } from "@prisma/client";
import { resolveCampaignJourney } from "../campaignJourney";

const state = (sheetStatus: CharacterSheetStatus | null, survey = false) =>
  resolveCampaignJourney("pilot-v1", sheetStatus ? { sheetStatus } : null, survey);

assert.deepEqual([state(null).state, state(null).route], ["CONTEXT_REQUIRED", "/campanhas/pilot-v1/episodio-1"]);
assert.deepEqual([state(CharacterSheetStatus.DRAFT).state, state(CharacterSheetStatus.DRAFT).route], ["CHARACTER_DRAFT", "/campanhas/pilot-v1/personagem"]);
assert.equal(state(CharacterSheetStatus.CHANGES_REQUESTED).state, "CHANGES_REQUIRED");
assert.equal(state(CharacterSheetStatus.CHANGES_REQUESTED, true).state, "COMPLETED_CHANGES_REQUIRED");
assert.deepEqual([state(CharacterSheetStatus.SUBMITTED).state, state(CharacterSheetStatus.SUBMITTED).route], ["SURVEY_REQUIRED", "/campanhas/pilot-v1/pesquisa"]);
assert.equal(state(CharacterSheetStatus.SUBMITTED, true).state, "COMPLETED_PENDING_REVIEW");
assert.equal(state(CharacterSheetStatus.APPROVED).state, "SURVEY_REQUIRED");
assert.equal(state(CharacterSheetStatus.APPROVED, true).state, "COMPLETED_APPROVED");

console.log("Campaign journey contract tests completed.");
