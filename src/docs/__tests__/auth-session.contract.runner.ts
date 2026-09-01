import assert from "node:assert/strict";
import { test } from "node:test";
import { authSessionContract, authSessionPaths, authSessionSchemas } from "../auth-session.contract";
import { openApiDocument, openApiSessionContractDocument } from "../openapi";

// Deliberately no app/service/Prisma import: these checks must run without secrets or DB.
const compatibilityExport = JSON.parse(JSON.stringify(openApiSessionContractDocument));
const deployed = JSON.parse(JSON.stringify(openApiDocument));

test("implemented session contract is the deployed OpenAPI contract", () => {
  assert.equal(deployed["x-auth-session-contract"].status, "implemented");
  assert.equal(deployed.info.version, "1.4.0");
  assert.ok(deployed.paths["/api/v1/auth/refresh"]);
  assert.ok(deployed.paths["/api/v1/auth/logout"]);
  assert.ok(deployed.components.schemas.AuthSessionTokenResponse);
  assert.deepEqual(compatibilityExport, deployed);
});

test("every reference in the deployed session contract resolves locally", () => {
  let references = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref") {
        assert.equal(typeof child, "string");
        const ref = child as string;
        assert.ok(ref.startsWith("#/"), ref);
        const target = ref.slice(2).split("/").reduce((node, part) =>
          node?.[part.replace(/~1/g, "/").replace(/~0/g, "~")], compatibilityExport);
        assert.notEqual(target, undefined, ref);
        references++;
      } else visit(child);
    }
  };
  visit(compatibilityExport);
  assert.ok(references > 0);
});

test("backend operations preserve shared operation IDs, auth and HTTP outcomes", () => {
  const expected = [
    ["login", "post", "backendLogin", ["200", "401", "403", "429"]],
    ["refresh", "post", "backendRefresh", ["200", "401", "409", "429"]],
    ["logout", "post", "backendLogout", ["200", "429"]],
    ["me", "get", "backendMe", ["200", "401", "403"]],
  ] as const;
  for (const [route, method, id, statuses] of expected) {
    const op = compatibilityExport.paths[`/api/v1/auth/${route}`][method];
    assert.equal(op.operationId, id);
    assert.equal(op["x-implementation-status"], "implemented");
    assert.deepEqual(Object.keys(op.responses), statuses);
    assert.deepEqual(op.security, route === "me" ? [{ bearerAuth: [] }] : []);
    for (const response of Object.values(op.responses) as any[]) {
      const resolved = response.$ref
        ? compatibilityExport.components.responses[response.$ref.split("/").pop()]
        : response;
      assert.deepEqual(resolved.headers["Cache-Control"].schema.enum, ["no-store"]);
      assert.ok(resolved.content["application/json"].schema.$ref);
    }
  }
  assert.ok(!Object.keys(compatibilityExport.paths).some(path => path.startsWith("/api/auth/")));
});

test("DTO names do not change the shared wire payload", () => {
  assert.deepEqual(authSessionSchemas.AuthSessionLoginRequest.required, ["email", "senha"]);
  assert.deepEqual(authSessionSchemas.AuthSessionRefreshRequest.required, ["refreshToken"]);
  assert.equal(authSessionSchemas.AuthSessionRefreshRequest.properties.refreshToken.writeOnly, true);
  assert.deepEqual(authSessionSchemas.AuthSessionTokenResponse.required, [
    "success", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "session", "user",
  ]);
  assert.equal("token" in authSessionSchemas.AuthSessionTokenResponse.properties, false);
  assert.deepEqual(authSessionSchemas.AuthSessionMeResponse.required, ["success", "user", "session"]);
  assert.deepEqual(authSessionSchemas.AuthSessionUser.properties.accountRole.enum, ["USER", "ADMIN"]);
  assert.deepEqual(authSessionSchemas.AuthSessionProjection.required, ["id", "expiresAt"]);
  assert.deepEqual(authSessionSchemas.AuthSessionLogoutResponse.properties.outcome.enum,
    ["revoked", "already_inactive", "local_only"]);
});

test("contract fixes TTLs and distinct error codes without claiming runtime coverage", () => {
  assert.equal(authSessionContract.accessTokenTtlSeconds, 600);
  assert.equal(authSessionContract.refreshTokenTtlSeconds, 7 * 24 * 60 * 60);
  assert.equal(authSessionContract.rotationConflictWindowSeconds, 5);
  assert.deepEqual(authSessionSchemas.AuthSessionErrorResponse.properties.error.properties.code.enum, [
    "AUTH_REQUIRED", "TOKEN_EXPIRED", "INVALID_TOKEN", "SESSION_REVOKED", "SESSION_EXPIRED",
    "REFRESH_REQUIRED", "INVALID_REFRESH_TOKEN", "REFRESH_TOKEN_REUSED", "REFRESH_ALREADY_ROTATED",
    "FORBIDDEN", "INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED", "RATE_LIMIT_EXCEEDED",
  ]);
});
