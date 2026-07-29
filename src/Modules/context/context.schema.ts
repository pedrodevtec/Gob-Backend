import {
  ContextClassification,
  ContextLayer,
  ContextVisibility,
} from "@prisma/client";
import { Request } from "express";
import {
  getBody,
  optionalString,
  requirePositiveInt,
  requireString,
} from "../../utils/validation";
import {
  AddContextUnitInput,
  CreateContextVersionInput,
  CreateEpisodeInput,
  CreateSettingInput,
} from "./context.types";
import { AppError } from "../../errors/AppError";

const requireEnum = <T extends Record<string, string>>(
  value: unknown,
  fieldName: string,
  enumObject: T,
  errorCode: string
): T[keyof T] => {
  if (typeof value !== "string" || !Object.values(enumObject).includes(value)) {
    throw new AppError(400, `Campo ${fieldName} invalido.`, errorCode);
  }

  return value as T[keyof T];
};

const requireStableKey = (value: unknown, fieldName: string): string => {
  const stableKey = requireString(value, fieldName, 2, 80);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(stableKey)) {
    throw new AppError(400, `Campo ${fieldName} deve ser um identificador estavel.`, "VALIDATION_ERROR");
  }

  return stableKey;
};

const requireOrigin = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw new AppError(400, "Origem do contexto e obrigatoria.", "MISSING_CONTEXT_ORIGIN");
  }

  return value.trim();
};

const requireApprovalResponsibility = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length < 3) {
    throw new AppError(
      400,
      "Responsabilidade de aprovacao e obrigatoria.",
      "MISSING_APPROVAL_RESPONSIBILITY"
    );
  }

  return value.trim();
};

const requireContextVersion = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 9999) {
    throw new AppError(400, "Versao de contexto invalida.", "INVALID_CONTEXT_VERSION");
  }

  return value;
};

export const validateCreateSetting = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateSettingInput = {
    stableKey: requireStableKey(body.stableKey, "stableKey"),
    title: requireString(body.title, "title", 2, 120),
    description: optionalString(body.description, "description", 1, 2000),
  };

  req.body = parsed;
};

export const validateCreateEpisode = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateEpisodeInput = {
    settingId: requireString(body.settingId, "settingId", 2, 120),
    stableKey: requireStableKey(body.stableKey, "stableKey"),
    title: requireString(body.title, "title", 2, 160),
    synopsis: optionalString(body.synopsis, "synopsis", 1, 2000),
  };

  req.body = parsed;
};

export const validateCreateContextVersion = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateContextVersionInput = {
    settingId: requireString(body.settingId, "settingId", 2, 120),
    episodeId: optionalString(body.episodeId, "episodeId", 2, 120),
    layer: requireEnum(body.layer, "layer", ContextLayer, "INVALID_CONTEXT_LAYER"),
    version: requireContextVersion(body.version),
    origin: requireOrigin(body.origin),
    approvalNote: requireApprovalResponsibility(body.approvalNote),
  };

  req.body = parsed;
};

export const validateAddContextUnit = (req: Request): void => {
  const body = getBody(req);
  const parsed: AddContextUnitInput = {
    contextVersionId: requireString(body.contextVersionId, "contextVersionId", 2, 120),
    classification: requireEnum(
      body.classification,
      "classification",
      ContextClassification,
      "INVALID_CONTEXT_CLASSIFICATION"
    ),
    visibility: requireEnum(
      body.visibility,
      "visibility",
      ContextVisibility,
      "INVALID_CONTEXT_VISIBILITY"
    ),
    title: requireString(body.title, "title", 2, 160),
    content: requireString(body.content, "content", 3, 20000),
    sortOrder:
      body.sortOrder === undefined
        ? undefined
        : requirePositiveInt(body.sortOrder, "sortOrder", { min: 0, max: 9999 }),
  };

  req.body = parsed;
};
