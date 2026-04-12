import { Request } from "express";
import { getBody, requireString } from "../../utils/validation";
import { CreatePvpMatchInput } from "./pvp.types";

export const validateCreatePvpMatch = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreatePvpMatchInput = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    opponentCharacterId: requireString(body.opponentCharacterId, "opponentCharacterId", 1, 80),
  };

  req.body = parsed;
};
