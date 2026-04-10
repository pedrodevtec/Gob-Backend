import { Response } from "express";

export const sendSuccess = (
  res: Response,
  statusCode: number,
  data: Record<string, unknown> = {},
  message?: string
): Response => {
  return res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    ...data,
  });
};
