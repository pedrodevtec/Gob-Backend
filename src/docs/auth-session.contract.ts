/**
 * Implemented backend counterpart of GOB-Frontend#31 and Gob-Backend#16.
 */
const schemaRef = (name: string) => ({ $ref: `#/components/schemas/AuthSession${name}` });
const responseRef = (name: string) => ({ $ref: `#/components/responses/AuthSession${name}` });
const json = (schema: object) => ({ "application/json": { schema } });
const request = (name: string) => ({ required: true, content: json(schemaRef(name)) });
const noStore = {
  "Cache-Control": {
    description: "Nunca armazenar respostas de autenticacao em caches.",
    schema: { type: "string", enum: ["no-store"] },
  },
};
const success = (description: string, name: string) => ({
  description,
  headers: noStore,
  content: json(schemaRef(name)),
});
const error = (description: string) => ({
  description,
  headers: noStore,
  content: json(schemaRef("ErrorResponse")),
});
const operation = {
  tags: ["Auth"],
  "x-owner": "Gob-Backend",
  "x-implementation-status": "implemented",
  description: "Contrato de sessao implementado pela Story 1.2 no Gob-Backend#17.",
};

export const authSessionContract = {
  version: "1.0.0",
  status: "implemented",
  approvalIssue: "https://github.com/pedrodevtec/Gob-Backend/issues/16",
  implementationIssue: "https://github.com/pedrodevtec/Gob-Backend/issues/17",
  source: "https://github.com/pedrodevtec/GOB-Frontend/pull/31",
  accessTokenTtlSeconds: 600,
  refreshTokenTtlSeconds: 604800,
  rotationConflictWindowSeconds: 5,
} as const;

export const authSessionSchemas = {
  AuthSessionLoginRequest: {
    type: "object", additionalProperties: false, required: ["email", "senha"],
    properties: {
      email: { type: "string", format: "email", maxLength: 254 },
      senha: { type: "string", minLength: 6, maxLength: 120, writeOnly: true },
    },
  },
  AuthSessionRefreshRequest: {
    type: "object", additionalProperties: false, required: ["refreshToken"],
    properties: { refreshToken: { type: "string", minLength: 32, maxLength: 512, writeOnly: true } },
  },
  AuthSessionUser: {
    type: "object", additionalProperties: false,
    required: ["id", "nome", "email", "accountRole", "emailVerifiedAt"],
    properties: {
      id: { type: "string", format: "uuid" },
      nome: { type: "string" },
      email: { type: "string", format: "email" },
      accountRole: { type: "string", enum: ["USER", "ADMIN"] },
      emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
      theme: { type: "string", nullable: true },
    },
  },
  AuthSessionProjection: {
    type: "object", additionalProperties: false, required: ["id", "expiresAt"],
    properties: {
      id: { type: "string", format: "uuid" },
      expiresAt: { type: "string", format: "date-time" },
    },
  },
  AuthSessionTokenResponse: {
    type: "object", additionalProperties: false,
    required: ["success", "accessToken", "accessTokenExpiresAt", "refreshToken", "refreshTokenExpiresAt", "session", "user"],
    properties: {
      success: { type: "boolean", enum: [true] },
      accessToken: { type: "string" },
      accessTokenExpiresAt: { type: "string", format: "date-time" },
      refreshToken: { type: "string", description: "Somente backend -> BFF; nunca devolver ao JavaScript do browser." },
      refreshTokenExpiresAt: { type: "string", format: "date-time" },
      session: schemaRef("Projection"),
      user: schemaRef("User"),
    },
  },
  AuthSessionMeResponse: {
    type: "object", required: ["success", "user", "session"],
    properties: {
      success: { type: "boolean", enum: [true] },
      user: schemaRef("User"),
      session: schemaRef("Projection"),
    },
  },
  AuthSessionLogoutResponse: {
    type: "object", additionalProperties: false, required: ["success", "outcome"],
    description: "O backend confirma revoked ou already_inactive. local_only pertence exclusivamente ao BFF quando a revogacao remota falha.",
    properties: {
      success: { type: "boolean" },
      outcome: { type: "string", enum: ["revoked", "already_inactive", "local_only"] },
    },
  },
  AuthSessionErrorResponse: {
    type: "object", additionalProperties: false, required: ["success", "error"],
    properties: {
      success: { type: "boolean", enum: [false] },
      error: {
        type: "object", additionalProperties: false, required: ["code", "message"],
        properties: {
          code: { type: "string", enum: [
            "AUTH_REQUIRED", "TOKEN_EXPIRED", "INVALID_TOKEN", "SESSION_REVOKED", "SESSION_EXPIRED",
            "REFRESH_REQUIRED", "INVALID_REFRESH_TOKEN", "REFRESH_TOKEN_REUSED", "REFRESH_ALREADY_ROTATED",
            "FORBIDDEN", "INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED", "RATE_LIMIT_EXCEEDED",
          ] },
          message: { type: "string" },
          requestId: { type: "string", nullable: true },
        },
      },
    },
  },
} as const;

export const authSessionResponses = {
  AuthSessionUnauthorized: error("Autenticacao ausente, invalida, expirada ou revogada. TOKEN_EXPIRED permite um refresh; revogacao exige novo login."),
  AuthSessionForbidden: error("Sessao valida sem permissao ou e-mail nao confirmado. Nunca iniciar refresh por 403."),
  AuthSessionConflict: error("REFRESH_ALREADY_ROTATED: token ja consumido ha menos de 5 segundos; nao emitir tokens nem revogar a familia."),
  AuthSessionTooManyRequests: error("RATE_LIMIT_EXCEEDED: limite de tentativas excedido."),
};

export const authSessionPaths = {
  "/api/v1/auth/login": {
    post: {
      ...operation, operationId: "backendLogin", summary: "Validar credenciais e criar sessao persistida",
      security: [], requestBody: request("LoginRequest"),
      responses: {
        "200": success("Sessao e tokens criados; sem o alias legado token.", "TokenResponse"),
        "401": responseRef("Unauthorized"), "403": responseRef("Forbidden"), "429": responseRef("TooManyRequests"),
      },
    },
  },
  "/api/v1/auth/refresh": {
    post: {
      ...operation, operationId: "backendRefresh", summary: "Consumir refresh token e criar sucessor atomico",
      security: [], requestBody: request("RefreshRequest"),
      responses: {
        "200": success("Tokens rotacionados na mesma familia, apos commit da transacao.", "TokenResponse"),
        "401": responseRef("Unauthorized"), "409": responseRef("Conflict"), "429": responseRef("TooManyRequests"),
      },
    },
  },
  "/api/v1/auth/logout": {
    post: {
      ...operation, operationId: "backendLogout", summary: "Revogar a familia representada pelo refresh token",
      security: [], requestBody: request("RefreshRequest"),
      responses: {
        "200": success("Logout idempotente: revoked ou already_inactive. Token predecessor tambem identifica a familia.", "LogoutResponse"),
        "429": responseRef("TooManyRequests"),
      },
    },
  },
  "/api/v1/auth/me": {
    get: {
      ...operation, operationId: "backendMe", summary: "Obter usuario da sessao ativa",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": success("Usuario atual e sessao ativa, validados no servidor.", "MeResponse"),
        "401": responseRef("Unauthorized"), "403": responseRef("Forbidden"),
      },
    },
  },
} as const;
