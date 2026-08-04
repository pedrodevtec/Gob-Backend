import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { PlayerAiService } from "./playerAi.service";

export const suggestPlayerCharacterHelp = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const suggestion = await PlayerAiService.suggestCharacterHelp(userId, tableId, req.body);
  sendSuccess(res, 200, { suggestion });
});

export const decidePlayerAiSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const suggestionId = requireString(req.params.suggestionId, "suggestionId");
  const suggestion = await PlayerAiService.decideSuggestion(userId, tableId, suggestionId, req.body);
  sendSuccess(res, 200, { suggestion }, "Decisao de sugestao registrada com sucesso.");
});
