import { Request } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalObject,
  optionalString,
  requireObject,
  requireString,
} from "../../utils/validation";
import { CreateTableInput, JoinTableInput, UpsertTableWorldInput } from "./table.types";

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
