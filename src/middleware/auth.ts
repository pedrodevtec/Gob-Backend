import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import { AuthTokenPayload } from "../types/auth";

export default function auth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new AppError(401, "Acesso negado. Nenhum token fornecido.", "AUTH_REQUIRED");
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;

    if (!decoded?.id) {
      throw new AppError(401, "Token invalido.", "INVALID_TOKEN");
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError(401, "Token invalido ou expirado.", "INVALID_TOKEN"));
  }
}
