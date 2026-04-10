import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export default function adminOnly(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.id) {
    next(new AppError(401, "Usuario nao autenticado.", "AUTH_REQUIRED"));
    return;
  }

  if (req.user.role !== "ADMIN") {
    next(new AppError(403, "Acesso restrito a administradores.", "ADMIN_REQUIRED"));
    return;
  }

  next();
}
