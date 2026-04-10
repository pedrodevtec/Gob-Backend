import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { TransactionService } from "./transaction.service";

export const getTransactionsByCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const transactions = await TransactionService.getByCharacter(userId, characterId);
  sendSuccess(res, 200, { transactions });
});
