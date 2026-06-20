import { NextFunction, Request, Response } from "express";

const tableIdFromRequest = (req: Request): string | undefined => {
  if (typeof req.params?.tableId === "string" && req.params.tableId) {
    return req.params.tableId;
  }

  const path = req.originalUrl.split("?")[0];
  const match = path.match(/\/tables\/([^/]+)/);
  const candidate = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return candidate && !["dashboard", "join"].includes(candidate)
    ? candidate
    : undefined;
};

export const requestDuration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startedAt = process.hrtime.bigint();

  res.once("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const log = {
      event: "http_request",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ...(req.user?.id ? { userId: req.user.id } : {}),
      ...(tableIdFromRequest(req) ? { tableId: tableIdFromRequest(req) } : {}),
    };

    console.info(JSON.stringify(log));
  });

  next();
};
