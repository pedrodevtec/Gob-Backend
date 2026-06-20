import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

type Bucket = {
  count: number;
  resetAt: number;
};

interface RateLimiterOptions {
  scope?: string;
  keyGenerator?: (req: Request) => string;
}

const buckets = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 60_000;

export const cleanupExpiredRateLimitBuckets = (now = Date.now()): number => {
  let removed = 0;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
      removed += 1;
    }
  }

  return removed;
};

const cleanupTimer = setInterval(
  cleanupExpiredRateLimitBuckets,
  CLEANUP_INTERVAL_MS
);
cleanupTimer.unref();

export const getRateLimitBucketCount = (): number => buckets.size;

const defaultKeyGenerator = (req: Request): string => {
  const actor = req.user?.id ?? req.ip ?? "unknown";
  const route = `${req.baseUrl}:${req.route?.path ?? req.path}`;
  return `${actor}:${route}`;
};

export const createRateLimiter = (
  maxRequests: number,
  windowMs: number,
  options: RateLimiterOptions = {}
) => {
  const scope = options.scope ?? "route";
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${scope}:${keyGenerator(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader("x-ratelimit-limit", String(maxRequests));
      res.setHeader("x-ratelimit-remaining", String(maxRequests - 1));
      res.setHeader("x-ratelimit-reset", String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    res.setHeader("x-ratelimit-limit", String(maxRequests));
    res.setHeader(
      "x-ratelimit-remaining",
      String(Math.max(0, maxRequests - current.count))
    );
    res.setHeader("x-ratelimit-reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count >= maxRequests) {
      res.setHeader(
        "retry-after",
        String(Math.max(1, Math.ceil((current.resetAt - now) / 1000)))
      );
      next(
        new AppError(429, "Muitas requisicoes. Tente novamente em instantes.", "RATE_LIMIT_EXCEEDED")
      );
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    res.setHeader(
      "x-ratelimit-remaining",
      String(Math.max(0, maxRequests - current.count))
    );
    next();
  };
};
