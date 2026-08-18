import assert from "node:assert/strict";
import type { Request } from "express";
import { validateCharacterMechanicalProposal } from "../../ai/playerAi.schema";
import { BuilderService } from "../builder.service";

const active = BuilderService.getActiveConfig();
assert.equal(active.version, "narrative-assisted-v1");
assert.equal(active.narrativeFlow?.visibleSteps, 4);
assert.deepEqual(active.narrativeFlow?.confirmationBlocks, ["identity", "motivations", "mark"]);
assert.equal(BuilderService.getRequiredEpisodeQuestionKeys(active.version).length, 0);
assert.equal(BuilderService.getRequiredEpisodeQuestionKeys("pilot-v1").length, 4);

const attributes = BuilderService.normalizeAttributes(
  { strength: 2, agility: 2, vigor: 2, intellect: 2, presence: 2, spirit: 2 },
  active.version
);
assert.equal(Object.values(attributes).reduce((sum, value) => sum + value, 0), 12);

const repairedOverflow = BuilderService.normalizeSuggestedAttributes(
  { strength: 4, agility: 4, vigor: 4, intellect: 4, presence: 4, spirit: 4 },
  active.version
);
assert.equal(Object.values(repairedOverflow).reduce((sum, value) => sum + value, 0), 12);
assert.equal(Object.values(repairedOverflow).every((value) => value >= 0 && value <= 4), true);

const repairedSurvivability = BuilderService.normalizeSuggestedAttributes(
  { strength: 4, agility: 4, vigor: 0, intellect: 2, presence: 2, spirit: 0 },
  active.version
);
assert.equal(Object.values(repairedSurvivability).reduce((sum, value) => sum + value, 0), 12);
assert.equal(repairedSurvivability.vigor >= 1 || repairedSurvivability.spirit >= 1, true);

assert.deepEqual(
  BuilderService.normalizeTrainings(["combat", "defense", "survival"], active.version),
  ["combat", "defense", "survival"]
);

const serialized = JSON.stringify(active);
for (const marker of ["gm_secret", "SECRET_CANON", "TABLE_MASTER", "AUTHOR_ADMIN"]) {
  assert.equal(serialized.includes(marker), false);
}

const mechanicalRequest = { body: { expectedRevision: 2 } } as Request;
validateCharacterMechanicalProposal(mechanicalRequest);
assert.deepEqual(mechanicalRequest.body, { expectedRevision: 2 });
assert.throws(
  () => validateCharacterMechanicalProposal({ body: { expectedRevision: 0 } } as Request),
  /expectedRevision/
);

console.log("Narrative Builder contract tests completed.");
