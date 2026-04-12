import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { PvpService } from "./pvp.service";

const parseRankingLimit = (value: unknown) => {
  if (value === undefined) {
    return 50;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    return 50;
  }

  return parsed;
};

export const getPvpOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const overview = await PvpService.getOverview(userId, characterId);
  sendSuccess(res, 200, { overview });
});

export const getPvpRanking = asyncHandler(async (req: Request, res: Response) => {
  requireUserId(req);
  const rankings = await PvpService.getRanking(parseRankingLimit(req.query.limit));
  sendSuccess(res, 200, { rankings });
});

export const createPvpMatch = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await PvpService.createMatch(userId, req.body);
  sendSuccess(res, 201, { result }, "Duelo PvP concluido com sucesso.");
});
