import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Rota nao encontrada: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
};
