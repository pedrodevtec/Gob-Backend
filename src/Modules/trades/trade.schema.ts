import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalNumber, optionalString, requirePositiveInt, requireString } from "../../utils/validation";
import { CreateTradeRequestInput, RespondTradeRequestInput, TradeAssetInput } from "./trade.types";

const parseTradeAssets = (value: unknown, fieldName: string): TradeAssetInput[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError(400, `Campo ${fieldName} deve ser uma lista.`, "VALIDATION_ERROR");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError(400, `Campo ${fieldName}[${index}] invalido.`, "VALIDATION_ERROR");
    }

    const assetType = requireString((entry as Record<string, unknown>).assetType, `${fieldName}[${index}].assetType`, 4, 20) as "ITEM" | "EQUIPMENT";

    if (!["ITEM", "EQUIPMENT"].includes(assetType)) {
      throw new AppError(400, `Campo ${fieldName}[${index}].assetType invalido.`, "VALIDATION_ERROR");
    }

    return {
      assetType,
      assetId: requireString((entry as Record<string, unknown>).assetId, `${fieldName}[${index}].assetId`, 1, 80),
      quantity: optionalNumber((entry as Record<string, unknown>).quantity, `${fieldName}[${index}].quantity`, {
        min: 1,
        max: 999,
      }),
    };
  });
};

export const validateCreateTradeRequest = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateTradeRequestInput = {
    requesterCharacterId: requireString(body.requesterCharacterId, "requesterCharacterId", 1, 80),
    targetCharacterId: requireString(body.targetCharacterId, "targetCharacterId", 1, 80),
    offeredCoins: optionalNumber(body.offeredCoins, "offeredCoins", { min: 0, max: 1_000_000_000 }),
    requestedCoins: optionalNumber(body.requestedCoins, "requestedCoins", { min: 0, max: 1_000_000_000 }),
    note: optionalString(body.note, "note", 1, 500),
    expiresInHours: optionalNumber(body.expiresInHours, "expiresInHours", { min: 1, max: 168 }),
    offeredAssets: parseTradeAssets(body.offeredAssets, "offeredAssets"),
    requestedAssets: parseTradeAssets(body.requestedAssets, "requestedAssets"),
  };

  if (
    (parsed.offeredCoins ?? 0) <= 0 &&
    (parsed.offeredAssets?.length ?? 0) === 0 &&
    (parsed.requestedCoins ?? 0) <= 0 &&
    (parsed.requestedAssets?.length ?? 0) === 0
  ) {
    throw new AppError(400, "A troca precisa ter oferta ou solicitacao de assets.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateRespondTradeRequest = (req: Request): void => {
  const body = getBody(req);
  const action = requireString(body.action, "action", 4, 10) as RespondTradeRequestInput["action"];

  if (!["ACCEPT", "REJECT", "CANCEL"].includes(action)) {
    throw new AppError(400, "Acao de trade invalida.", "VALIDATION_ERROR");
  }

  req.body = { action };
};
