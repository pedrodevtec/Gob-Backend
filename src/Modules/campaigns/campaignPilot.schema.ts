import { Request } from "express";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalObject,
  optionalString,
  requireString,
} from "../../utils/validation";
import { ANALYTICS_EVENT_KEYS } from "./campaignPilot.config";
import {
  RecordAnalyticsEventInput,
  SubmitFinalSurveyInput,
} from "./campaignPilot.types";

const requireScore = (value: unknown, fieldName: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new AppError(400, `Campo ${fieldName} deve ser uma escala de 1 a 5.`, "VALIDATION_ERROR");
  }

  return value;
};

const requireBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new AppError(400, `Campo ${fieldName} deve ser booleano.`, "VALIDATION_ERROR");
  }

  return value;
};

const requireAiHelpfulness = (value: unknown): number | "NOT_USED" => {
  if (value === "NOT_USED" || value === "Nao usei a IA" || value === "Não usei a IA") {
    return "NOT_USED";
  }

  return requireScore(value, "aiHelpfulnessScore");
};

const optionalSurveyText = (value: unknown, fieldName: string): string | undefined => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return optionalString(value, fieldName, 1, 2000);
};

export const validateSubmitFinalSurvey = (req: Request): void => {
  const body = getBody(req);
  const aiBoundaryProblem = requireBoolean(body.aiBoundaryProblem, "aiBoundaryProblem");
  const parsed: SubmitFinalSurveyInput = {
    characterUnderstandingScore: requireScore(
      body.characterUnderstandingScore,
      "characterUnderstandingScore"
    ),
    creationExperienceScore: requireScore(body.creationExperienceScore, "creationExperienceScore"),
    aiHelpfulnessScore: requireAiHelpfulness(body.aiHelpfulnessScore),
    aiBoundaryProblem,
    aiBoundaryProblemDetails: aiBoundaryProblem
      ? optionalSurveyText(body.aiBoundaryProblemDetails, "aiBoundaryProblemDetails")
      : undefined,
    storyImpactScore: requireScore(body.storyImpactScore, "storyImpactScore"),
    finalComment: optionalSurveyText(body.finalComment, "finalComment"),
  };

  req.body = parsed;
};

export const validateRecordAnalyticsEvent = (req: Request): void => {
  const body = getBody(req);
  const eventKey = requireString(body.eventKey, "eventKey", 3, 80);

  if (!ANALYTICS_EVENT_KEYS.includes(eventKey as (typeof ANALYTICS_EVENT_KEYS)[number])) {
    throw new AppError(400, "Evento de analytics invalido.", "INVALID_ANALYTICS_EVENT");
  }

  req.body = {
    eventKey,
    characterId: optionalString(body.characterId, "characterId", 1, 120),
    sessionId: optionalString(body.sessionId, "sessionId", 1, 120),
    source: optionalString(body.source, "source", 1, 80),
    metadata: optionalObject(body.metadata, "metadata") as RecordAnalyticsEventInput["metadata"],
  } satisfies RecordAnalyticsEventInput;
};
