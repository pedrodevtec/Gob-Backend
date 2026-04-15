import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalNumber, optionalString, requireString } from "../../utils/validation";
import {
  BountyHuntInput,
  CombatTurnInput,
  MarketActionInput,
  MissionInput,
  NpcInteractionInput,
  ProgressMissionJourneyInput,
  StartMissionJourneyInput,
  TrainingInput,
} from "./gameplay.types";

const requireEnumValue = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T => {
  const normalized = requireString(value, fieldName, 1, 50) as T;

  if (!allowedValues.includes(normalized)) {
    throw new AppError(
      400,
      `Campo ${fieldName} deve ser um dos valores: ${allowedValues.join(", ")}.`,
      "VALIDATION_ERROR"
    );
  }

  return normalized;
};

export const validateBountyHunt = (req: Request): void => {
  const body = getBody(req);
  const parsed: BountyHuntInput = {
    bountyId: requireString(body.bountyId, "bountyId", 1, 80),
  };

  req.body = parsed;
};

export const validateMission = (req: Request): void => {
  const body = getBody(req);
  const parsed: MissionInput = {
    missionId: requireString(body.missionId, "missionId", 1, 80),
  };

  req.body = parsed;
};

export const validateTraining = (req: Request): void => {
  const body = getBody(req);
  const parsed: TrainingInput = {
    trainingId: requireString(body.trainingId, "trainingId", 1, 80),
  };

  req.body = parsed;
};

export const validateNpcInteraction = (req: Request): void => {
  const body = getBody(req);
  const buffPercent = optionalNumber(body.buffPercent, "buffPercent", { min: 2, max: 6 });

  if (buffPercent !== undefined && ![2, 4, 6].includes(buffPercent)) {
    throw new AppError(
      400,
      "Campo buffPercent deve ser um dos valores: 2, 4, 6.",
      "VALIDATION_ERROR"
    );
  }

  const parsed: NpcInteractionInput = {
    npcId: requireString(body.npcId, "npcId", 1, 80),
    ...(buffPercent !== undefined ? { buffPercent: buffPercent as 2 | 4 | 6 } : {}),
  };

  req.body = parsed;
};

export const validateStartMissionJourney = (req: Request): void => {
  const body = getBody(req);
  const parsed: StartMissionJourneyInput = {
    missionId: requireString(body.missionId, "missionId", 1, 80),
    npcId: requireString(body.npcId, "npcId", 1, 80),
  };

  req.body = parsed;
};

export const validateProgressMissionJourney = (req: Request): void => {
  const body = getBody(req);
  const parsed: ProgressMissionJourneyInput = {
    choiceId: optionalString(body.choiceId, "choiceId", 1, 80),
    npcId: optionalString(body.npcId, "npcId", 1, 80),
  };

  if (!parsed.choiceId && !parsed.npcId) {
    req.body = {};
    return;
  }

  req.body = parsed;
};

export const validateMarketAction = (req: Request): void => {
  const body = getBody(req);
  const parsed: MarketActionInput = {
    action: requireEnumValue(body.action, "action", ["barter", "scavenge"]),
  };

  req.body = parsed;
};

export const validateCombatTurn = (req: Request): void => {
  const body = getBody(req);
  const parsed: CombatTurnInput = {
    action: requireEnumValue(body.action, "action", ["ATTACK", "DEFEND", "POWER_ATTACK"]),
  };

  req.body = parsed;
};
