import { Request } from "express";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalNumber,
  optionalString,
  requireString,
} from "../../utils/validation";
import {
  AwakenCharacterInput,
  CreateCharacterInput,
  UpdateCharacterCustomizationInput,
  UpdateCharacterPositionInput,
  UpdateCharacterProfileInput,
  UpdateCharacterProgressInput,
} from "./character.types";

const allowedAvatarIds = new Set(["blade", "crown", "phoenix", "moon"]);
const allowedTitleIds = new Set(["wanderer", "hunter", "warden", "arcanist"]);
const allowedBannerIds = new Set(["royal", "ocean", "ember", "verdant"]);

export const validateCreateCharacter = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateCharacterInput = {
    name: requireString(body.name ?? body.nome, "name", 2, 40),
    classId: optionalString(body.classId, "classId", 1, 80),
  };

  req.body = parsed;
};

export const validateUpdateCharacterProfile = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateCharacterProfileInput = {
    name: optionalString(body.name ?? body.nome, "name", 2, 40),
  };

  if (!parsed.name) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizar personagem.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateUpdateCharacterProgress = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateCharacterProgressInput = {
    xp: optionalNumber(body.xp, "xp", { min: 0, max: 1_000_000_000 }),
    level: optionalNumber(body.level, "level", { min: 1, max: 10_000 }),
    lastCheckpoint: optionalString(body.lastCheckpoint, "lastCheckpoint", 1, 120),
  };

  if (
    parsed.xp === undefined &&
    parsed.level === undefined &&
    parsed.lastCheckpoint === undefined
  ) {
    throw new AppError(400, "Nenhum campo valido enviado para progresso.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateUpdateCharacterPosition = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateCharacterPositionInput = {
    posX: optionalNumber(body.posX, "posX"),
    posY: optionalNumber(body.posY, "posY"),
    posZ: optionalNumber(body.posZ, "posZ"),
    lastCheckpoint: optionalString(body.lastCheckpoint, "lastCheckpoint", 1, 120),
  };

  if (
    parsed.posX === undefined &&
    parsed.posY === undefined &&
    parsed.posZ === undefined &&
    parsed.lastCheckpoint === undefined
  ) {
    throw new AppError(400, "Nenhum campo valido enviado para posicao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateAwakenCharacter = (req: Request): void => {
  const body = getBody(req);
  const parsed: AwakenCharacterInput = {
    targetClassId: requireString(body.targetClassId, "targetClassId", 1, 80),
  };

  req.body = parsed;
};

export const validateUpdateCharacterCustomization = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateCharacterCustomizationInput = {
    avatarId: optionalString(body.avatarId, "avatarId", 2, 40),
    titleId: optionalString(body.titleId, "titleId", 2, 40),
    bannerId: optionalString(body.bannerId, "bannerId", 2, 40),
  };

  if (parsed.avatarId && !allowedAvatarIds.has(parsed.avatarId)) {
    throw new AppError(400, "Avatar informado invalido.", "VALIDATION_ERROR");
  }

  if (parsed.titleId && !allowedTitleIds.has(parsed.titleId)) {
    throw new AppError(400, "Titulo informado invalido.", "VALIDATION_ERROR");
  }

  if (parsed.bannerId && !allowedBannerIds.has(parsed.bannerId)) {
    throw new AppError(400, "Banner informado invalido.", "VALIDATION_ERROR");
  }

  if (parsed.avatarId === undefined && parsed.titleId === undefined && parsed.bannerId === undefined) {
    throw new AppError(400, "Nenhum campo valido enviado para personalizacao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};
