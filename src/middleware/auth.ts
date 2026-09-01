import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { AuthTokenPayload } from "../types/auth";
import { permissionDebug } from "../utils/permissionDebug";
import { createRateLimiter } from "./rateLimit";
import { AuthSessionService } from "../Modules/auth/authSession.service";

const authenticatedApiLimiter = createRateLimiter(240, 60_000, {
  scope: "authenticated-api",
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
});
const authenticatedWriteLimiter = createRateLimiter(80, 60_000, {
  scope: "authenticated-api-write",
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
});
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default async function auth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new AppError(401, "Acesso negado. Nenhum token fornecido.", "AUTH_REQUIRED");
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    let decoded: AuthTokenPayload & { role?: "PLAYER" | "ADMIN" | "MASTER" };

    try {
      const claims = AuthSessionService.verifyAccessToken(token);
      const active = await AuthSessionService.validateActiveSession(claims);
      req.user = {
        id: claims.sub,
        accountRole: active.user.accountRole,
        sessionId: active.session.id,
        sessionExpiresAt: active.session.expiresAt,
      };
      decoded = { id: claims.sub, accountRole: active.user.accountRole };
    } catch (sessionError) {
      if (env.NODE_ENV === "production") {
        throw sessionError;
      }

      // Development-only bridge for pre-Story-1.2 fixtures and local clients.
      // Production never accepts a bearer token without a persisted sid.
      let legacy: AuthTokenPayload & { role?: "PLAYER" | "ADMIN" | "MASTER" };
      try {
        legacy = jwt.verify(token, env.JWT_SECRET) as typeof legacy;
      } catch {
        throw sessionError;
      }
      if (!legacy?.id) {
        throw sessionError;
      }
      decoded = legacy;
    }

    if (!decoded?.id) {
      throw new AppError(401, "Token invalido.", "INVALID_TOKEN");
    }

    const normalizedAccountRole =
      decoded.accountRole === "ADMIN" || decoded.role === "ADMIN" ? "ADMIN" : "USER";

    if (!req.user) {
      req.user = { id: decoded.id, accountRole: normalizedAccountRole };
    }

    permissionDebug("auth.token.normalized", {
      requestId: req.requestId,
      path: req.originalUrl,
      userId: decoded.id,
      tokenAccountRole: decoded.accountRole ?? null,
      legacyTokenRole: decoded.role ?? null,
      normalizedAccountRole,
    });
    authenticatedApiLimiter(req, _res, (rateLimitError?: unknown) => {
      if (rateLimitError) {
        next(rateLimitError);
        return;
      }

      if (!WRITE_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
      }

      authenticatedWriteLimiter(req, _res, next);
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Token invalido ou expirado.", "INVALID_TOKEN"));
  }
}
