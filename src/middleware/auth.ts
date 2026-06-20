import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { AuthTokenPayload } from "../types/auth";
import { permissionDebug } from "../utils/permissionDebug";
import { createRateLimiter } from "./rateLimit";

const authenticatedApiLimiter = createRateLimiter(240, 60_000, {
  scope: "authenticated-api",
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
});
const authenticatedWriteLimiter = createRateLimiter(80, 60_000, {
  scope: "authenticated-api-write",
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
});
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default function auth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new AppError(401, "Acesso negado. Nenhum token fornecido.", "AUTH_REQUIRED");
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload & {
      role?: "PLAYER" | "ADMIN" | "MASTER";
    };

    if (!decoded?.id) {
      throw new AppError(401, "Token invalido.", "INVALID_TOKEN");
    }

    const normalizedAccountRole =
      decoded.accountRole === "ADMIN" || decoded.role === "ADMIN" ? "ADMIN" : "USER";

    req.user = {
      id: decoded.id,
      accountRole: normalizedAccountRole,
    };

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
