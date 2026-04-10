import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { RewardsService } from "./rewards.service";

export const claimReward = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await RewardsService.claim(userId, req.body);
  sendSuccess(res, 201, result, "Recompensa resgatada com sucesso.");
});

export const listRewardClaims = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const claims = await RewardsService.listClaims(userId, characterId);
  sendSuccess(res, 200, { claims });
});
