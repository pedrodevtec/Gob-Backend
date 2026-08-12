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
