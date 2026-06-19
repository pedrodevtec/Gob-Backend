import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { AiService } from "./ai.service";

const getContext = (req: Request): { userId: string; tableId: string } => ({
  userId: requireUserId(req),
  tableId: requireString(req.params.tableId, "tableId"),
});

export const suggestWorldSummary = asyncHandler(async (req: Request, res: Response) => {
  const { userId, tableId } = getContext(req);
  const suggestion = await AiService.suggestWorldSummary(userId, tableId, req.body);
  sendSuccess(res, 200, { ...suggestion });
});

export const suggestMissionIdeas = asyncHandler(async (req: Request, res: Response) => {
  const { userId, tableId } = getContext(req);
  const suggestion = await AiService.suggestMissionIdeas(userId, tableId, req.body);
  sendSuccess(res, 200, { ...suggestion });
});

export const suggestTraits = asyncHandler(async (req: Request, res: Response) => {
  const { userId, tableId } = getContext(req);
  const suggestion = await AiService.suggestTraits(userId, tableId, req.body);
  sendSuccess(res, 200, { ...suggestion });
});

export const suggestTimelineSummary = asyncHandler(async (req: Request, res: Response) => {
  const { userId, tableId } = getContext(req);
  const suggestion = await AiService.suggestTimelineSummary(userId, tableId, req.body);
  sendSuccess(res, 200, { ...suggestion });
});
