import { Request } from "express";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalString,
  requirePositiveInt,
  requireString,
} from "../../utils/validation";
import { ClaimRewardInput } from "./rewards.types";

export const validateClaimReward = (req: Request): void => {
  const body = getBody(req);
  const type = requireString(body.type, "type", 2, 20).toUpperCase();

  if (!["COINS", "XP"].includes(type)) {
    throw new AppError(400, "Tipo de recompensa invalido.", "VALIDATION_ERROR");
  }

  const parsed: ClaimRewardInput = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    claimKey: requireString(body.claimKey, "claimKey", 3, 120),
    type: type as ClaimRewardInput["type"],
    value: requirePositiveInt(body.value, "value", { min: 1, max: 1_000_000 }),
    metadata: optionalString(body.metadata, "metadata", 1, 500),
  };

  req.body = parsed;
};
