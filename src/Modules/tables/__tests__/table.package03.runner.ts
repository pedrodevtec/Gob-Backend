import assert from "node:assert/strict";
import { Request } from "express";
import {
  validateCreatePackage03Character,
  validateReviewPackage03Character,
  validateUpdatePackage03Character,
  validateUpsertCharacterEpisodeAnswers,
} from "../table.schema";

const req = (body: unknown): Request => ({ body } as Request);

const test = (name: string, run: () => void): void => {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

const assertAppErrorCode = (run: () => void, code: string): void => {
  assert.throws(run, (error: unknown) => {
    assert.equal((error as { code?: string }).code, code);
    return true;
  });
};

test("Package 03 rejeita ownership e auditoria enviados pelo cliente", () => {
  assertAppErrorCode(
    () => validateCreatePackage03Character(req({ name: "Ayla", ownerUserId: "outro" })),
    "FORBIDDEN_CHARACTER_FIELD"
  );
  assertAppErrorCode(
    () => validateUpdatePackage03Character(req({ sheetStatus: "APPROVED" })),
    "FORBIDDEN_CHARACTER_FIELD"
  );
});

test("Package 03 normaliza payload minimo de ficha", () => {
  const request = req({
    name: "Ayla",
    archetypeKey: "guardian_blade",
    creativeDossier: { hook: "Juramento antigo", tone: "sombrio" },
  });
  validateCreatePackage03Character(request);
  assert.equal(request.body.name, "Ayla");
  assert.equal(request.body.archetypeKey, "guardian_blade");
  assert.deepEqual(request.body.creativeDossier, { hook: "Juramento antigo", tone: "sombrio" });
  assert.equal(request.body.ownerUserId, undefined);
});

test("Package 03 aceita contexto narrativo sem permitir forjar a versao", () => {
  const request = req({
    narrativeResponses: {
      before_mark: "Era ferreira na muralha.",
      motivation_and_bonds: "Protege a familia.",
      mark_change: "A Marca aquece quando ha perigo.",
    },
    confirmedNarrativeContext: {
      confirmedBlocks: ["identity", "motivations", "mark"],
      fields: { name: "Ayla", concept: "Ferreira protetora" },
    },
    playStylePreference: "protect",
  });
  validateUpdatePackage03Character(request);
  assert.equal(request.body.narrativeResponses.before_mark, "Era ferreira na muralha.");
  assert.equal(request.body.playStylePreference, "protect");
  assertAppErrorCode(
    () => validateUpdatePackage03Character(req({ builderConfigVersion: "pilot-v1" })),
    "FORBIDDEN_CHARACTER_FIELD"
  );
});

test("Package 03 rejeita update sem campos validos", () => {
  assertAppErrorCode(() => validateUpdatePackage03Character(req({})), "VALIDATION_ERROR");
});

test("Package 03 rejeita resposta duplicada no mesmo payload", () => {
  assertAppErrorCode(
    () =>
      validateUpsertCharacterEpisodeAnswers(
        req({
          answers: [
            { questionKey: "relationship_with_erya", answer: "A" },
            { questionKey: "relationship_with_erya", answer: "B" },
          ],
        })
      ),
    "DUPLICATE_EPISODE_ANSWER"
  );
});

test("Package 03 normaliza review com expectedRevision", () => {
  const request = req({ reason: "Ajustar promessa", expectedRevision: 2 });
  validateReviewPackage03Character(request);
  assert.deepEqual(request.body, { reason: "Ajustar promessa", expectedRevision: 2 });
});

console.log("Table Package 03 unit tests completed.");
