import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.route?.path ?? req.path}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      next(
        new AppError(429, "Muitas requisicoes. Tente novamente em instantes.", "RATE_LIMIT_EXCEEDED")
      );
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
};
