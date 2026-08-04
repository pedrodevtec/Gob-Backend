import { Request } from "express";
import { ParticipantConsentStatus, PublicCampaignStatus } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requireString } from "../../utils/validation";
import {
  CampaignStatusTransitionInput,
  CreatePublicCampaignInput,
  RecordConsentInput,
  UpdatePublicCampaignInput,
} from "./campaign.types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeCampaignSlug = (value: string): string => {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 80 || !SLUG_REGEX.test(slug)) {
    throw new AppError(
      400,
      "Slug de campanha deve conter letras minusculas, numeros e hifens, entre 3 e 80 caracteres.",
      "INVALID_CAMPAIGN_SLUG"
    );
  }

  return slug;
};

export const validateCreatePublicCampaign = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreatePublicCampaignInput = {
    tableId: requireString(body.tableId, "tableId", 2, 120),
    title: requireString(body.title, "title", 2, 120),
    description: optionalString(body.description, "description", 1, 2000),
    slug:
      body.slug === undefined
        ? undefined
        : normalizeCampaignSlug(requireString(body.slug, "slug", 3, 80)),
  };

  req.body = parsed;
};

export const validateUpdatePublicCampaign = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdatePublicCampaignInput = {
    title: optionalString(body.title, "title", 2, 120),
    description:
      body.description === null
        ? undefined
        : optionalString(body.description, "description", 1, 2000),
    slug:
      body.slug === undefined
        ? undefined
        : normalizeCampaignSlug(requireString(body.slug, "slug", 3, 80)),
  };

  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizar campanha.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateCampaignStatusTransition = (req: Request): void => {
  const body = getBody(req);
  const status = requireString(body.status, "status", 5, 10).toUpperCase() as PublicCampaignStatus;

  if (!["ACTIVE", "CLOSED"].includes(status)) {
    throw new AppError(400, "Status de campanha invalido.", "INVALID_CAMPAIGN_STATUS");
  }

  req.body = { status: status as CampaignStatusTransitionInput["status"] };
};

export const validateRecordConsent = (req: Request): void => {
  const body = getBody(req);
  const status = requireString(body.status, "status", 7, 8).toUpperCase() as ParticipantConsentStatus;

  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    throw new AppError(400, "Status de consentimento invalido.", "INVALID_CONSENT_STATUS");
  }

  req.body = {
    status: status as RecordConsentInput["status"],
    source: optionalString(body.source, "source", 1, 80),
  } satisfies RecordConsentInput;
};
