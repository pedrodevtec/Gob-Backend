import { Request } from "express";
import { CharacterTraitType, Prisma, TableMissionStatus, TableTimelineEventType } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalObject,
  optionalString,
  requireObject,
  requireString,
} from "../../utils/validation";
import { CreateTableInput, JoinTableInput, UpsertTableWorldInput } from "./table.types";

const optionalBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new AppError(400, `Campo ${fieldName} deve ser booleano.`, "VALIDATION_ERROR");
  }

  return value;
};

const optionalDate = (value: unknown, fieldName: string): Date | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return undefined;
  }

  const raw = requireString(value, fieldName, 1, 80);
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `Campo ${fieldName} deve ser uma data valida.`, "VALIDATION_ERROR");
  }

  return parsed;
};

const optionalNullableDate = (value: unknown, fieldName: string): Date | null | undefined => {
  if (value === null) {
    return null;
  }

  return optionalDate(value, fieldName);
};

export const validateCreateTable = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreateTableInput = {
    name: requireString(body.name, "name", 2, 80),
  };

  req.body = parsed;
};

export const validateJoinTable = (req: Request): void => {
  const body = getBody(req);
  const parsed: JoinTableInput = {
    joinCode: requireString(body.joinCode, "joinCode", 4, 16).toUpperCase(),
  };

  req.body = parsed;
};

export const validateUpsertTableWorld = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpsertTableWorldInput = {
    campaignTitle: requireString(body.campaignTitle, "campaignTitle", 2, 120),
    summary: requireString(body.summary, "summary", 1, 4000),
    tone: optionalString(body.tone, "tone", 1, 120),
    rules: optionalObject(body.rules, "rules") as Prisma.InputJsonValue | undefined,
    characterCreationCriteria: optionalObject(
      body.characterCreationCriteria,
      "characterCreationCriteria"
    ) as Prisma.InputJsonValue | undefined,
  };

  if (body.rules !== undefined) {
    requireObject(body.rules, "rules");
  }

  if (body.characterCreationCriteria !== undefined) {
    requireObject(body.characterCreationCriteria, "characterCreationCriteria");
  }

  if (!parsed.campaignTitle || !parsed.summary) {
    throw new AppError(400, "Titulo e resumo da campanha sao obrigatorios.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateReviewTableCharacter = (req: Request): void => {
  const body = getBody(req);
  const status = requireString(body.status, "status", 7, 20) as
    | "APPROVED"
    | "REJECTED"
    | "NEEDS_CHANGES";

  if (!["APPROVED", "REJECTED", "NEEDS_CHANGES"].includes(status)) {
    throw new AppError(400, "Status de revisao invalido.", "VALIDATION_ERROR");
  }

  req.body = {
    status,
    masterFeedback: optionalString(body.masterFeedback, "masterFeedback", 1, 2000),
  };
};

export const validateCreateCharacterTrait = (req: Request): void => {
  const body = getBody(req);
  const type = requireString(body.type, "type", 7, 20) as CharacterTraitType;

  if (!["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(type)) {
    throw new AppError(400, "Tipo de trait invalido.", "VALIDATION_ERROR");
  }

  req.body = {
    type,
    name: requireString(body.name, "name", 2, 80),
    description: optionalString(body.description, "description", 1, 1000),
  };
};

export const validateCreateTableMission = (req: Request): void => {
  const body = getBody(req);

  req.body = {
    title: requireString(body.title, "title", 2, 120),
    description: requireString(body.description, "description", 1, 4000),
    objective: optionalString(body.objective, "objective", 1, 1000),
    isRequired: optionalBoolean(body.isRequired, "isRequired"),
    dueDate: optionalDate(body.dueDate, "dueDate"),
  };
};

export const validateUpdateTableMission = (req: Request): void => {
  const body = getBody(req);
  const status = body.status === undefined
    ? undefined
    : (requireString(body.status, "status", 6, 20) as TableMissionStatus);

  if (status && !["ACTIVE", "COMPLETED", "ARCHIVED"].includes(status)) {
    throw new AppError(400, "Status de missao invalido.", "VALIDATION_ERROR");
  }

  const parsed = {
    title: optionalString(body.title, "title", 2, 120),
    description: optionalString(body.description, "description", 1, 4000),
    objective: body.objective === null ? null : optionalString(body.objective, "objective", 1, 1000),
    isRequired: optionalBoolean(body.isRequired, "isRequired"),
    status,
    dueDate: optionalNullableDate(body.dueDate, "dueDate"),
  };

  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizar missao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateCreateMissionSubmission = (req: Request): void => {
  const body = getBody(req);

  req.body = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    content: requireString(body.content, "content", 1, 8000),
  };
};

export const validateReviewMissionSubmission = (req: Request): void => {
  const body = getBody(req);
  const status = requireString(body.status, "status", 7, 20) as
    | "APPROVED"
    | "REJECTED"
    | "NEEDS_CHANGES";

  if (!["APPROVED", "REJECTED", "NEEDS_CHANGES"].includes(status)) {
    throw new AppError(400, "Status de submissao invalido.", "VALIDATION_ERROR");
  }

  req.body = {
    status,
    masterNote: optionalString(body.masterNote, "masterNote", 1, 2000),
  };
};

export const validateCreateTimelineEvent = (req: Request): void => {
  const body = getBody(req);
  const type = requireString(body.type, "type", 5, 30) as TableTimelineEventType;

  if (
    ![
      "STORY",
      "MISSION_CREATED",
      "MISSION_APPROVED",
      "CHARACTER_APPROVED",
      "REWARD",
      "MASTER_NOTE",
      "SESSION_SUMMARY",
    ].includes(type)
  ) {
    throw new AppError(400, "Tipo de evento de timeline invalido.", "VALIDATION_ERROR");
  }

  req.body = {
    characterId: optionalString(body.characterId, "characterId", 1, 80),
    title: requireString(body.title, "title", 2, 140),
    description: requireString(body.description, "description", 1, 4000),
    type,
  };
};
