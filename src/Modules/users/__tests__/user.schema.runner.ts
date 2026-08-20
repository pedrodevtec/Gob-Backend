import assert from "node:assert/strict";
import { Request } from "express";
import { validateUpdateProfile } from "../user.schema";

const requestWithBody = (body: Record<string, unknown>) => ({ body } as Request);

const valid = requestWithBody({ selectedGuardianAvatar: "guardian_explorer" });
validateUpdateProfile(valid);
assert.equal(valid.body.selectedGuardianAvatar, "guardian_explorer");

assert.throws(
  () => validateUpdateProfile(requestWithBody({ selectedGuardianAvatar: "guardian_unknown" })),
  (error: unknown) =>
    error instanceof Error && error.message === "Guardiao informado invalido."
);

assert.throws(
  () => validateUpdateProfile(requestWithBody({})),
  (error: unknown) =>
    error instanceof Error && error.message === "Nenhum campo valido enviado para atualizacao."
);

console.log("PASS user profile guardian avatar validation");
