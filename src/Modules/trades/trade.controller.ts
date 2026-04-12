import { Request, Response } from "express";
import { TradeService } from "./trade.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";

export const listTrades = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const trades = await TradeService.listTrades(userId, characterId);
  sendSuccess(res, 200, { trades });
});

export const createTradeRequest = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const trade = await TradeService.createTradeRequest(userId, req.body);
  sendSuccess(res, 201, { trade }, "Solicitacao de troca criada com sucesso.");
});

export const respondTradeRequest = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tradeId = requireString(req.params.tradeId, "tradeId");
  const trade = await TradeService.respondTradeRequest(userId, tradeId, req.body);
  sendSuccess(res, 200, { trade }, "Troca atualizada com sucesso.");
});
