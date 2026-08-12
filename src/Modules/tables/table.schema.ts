import { Request } from "express";
import {
  CharacterReviewStatus,
  CharacterTraitSuggestionSource,
  CharacterTraitType,
  Prisma,
  TableStatus,
  TableMissionStatus,
  TableMissionSubmissionStatus,
  TableTimelineEventType,
} from "@prisma/client";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  requireEmail,
  optionalString,
  requirePositiveInt,
  requireObject,
  requireString,
} from "../../utils/validation";
import {
  CreateTableInput,
  AcceptTableInvitationInput,
  CharacterEpisodeAnswerInput,
  CharacterSheetInput,
  CreateCharacterTraitSuggestionInput,
  CreateTableInvitationInput,
  CursorPaginationQuery,
  JoinTableInput,
  ListCharacterTraitsQuery,
  ListTableCharactersQuery,
  ListTableMissionsQuery,
  ListTableSubmissionsQuery,
  ListTableTimelineQuery,
  ReviewCharacterInput,
  UpsertTableWorldInput,
  UpdateTableInput,
} from "./table.types";

const SUBMISSION_STATUSES: TableMissionSubmissionStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "NEEDS_CHANGES",
];
const CHARACTER_REVIEW_STATUSES: CharacterReviewStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_CHANGES",
];
const MISSION_STATUSES: TableMissionStatus[] = [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
];
const TRAIT_SUGGESTION_SOURCES: CharacterTraitSuggestionSource[] = ["AI", "MASTER"];

const parseCursorPagination = (req: Request): CursorPaginationQuery => {
  const rawCursor = req.query.cursor;
  const rawLimit = req.query.limit;

  if (Array.isArray(rawCursor) || Array.isArray(rawLimit)) {
    throw new AppError(400, "Parametros de consulta invalidos.", "VALIDATION_ERROR");
  }

  const cursor =
    rawCursor === undefined ? undefined : requireString(rawCursor, "cursor", 1, 100);

  let limit = 20;
  if (rawLimit !== undefined) {
    if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit)) {
      throw new AppError(400, "Campo limit deve ser um inteiro.", "VALIDATION_ERROR");
    }

    limit = Number(rawLimit);
    if (limit < 1 || limit > 50) {
      throw new AppError(
        400,
        "Campo limit deve estar entre 1 e 50.",
        "VALIDATION_ERROR"
      );
    }
  }

  return { cursor, limit };
};

const setNormalizedQuery = (
  req: Request,
  pagination: CursorPaginationQuery,
  filters: Record<string, string | undefined> = {}
): void => {
  req.query = {
    ...Object.fromEntries(
      Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))
    ),
    ...(pagination.cursor ? { cursor: pagination.cursor } : {}),
    limit: String(pagination.limit),
  };
};

const optionalJsonTextOrObject = (
  value: unknown,
  fieldName: string
): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return { text: value };
  }

  return requireObject(value, fieldName) as Prisma.InputJsonObject;
};

const optionalJsonObject = (
  value: unknown,
  fieldName: string
): Prisma.InputJsonObject | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return requireObject(value, fieldName) as Prisma.InputJsonObject;
};

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
    description: optionalString(body.description, "description", 1, 2000),
    settingId: requireString(body.settingId, "settingId", 2, 120),
    episodeId: requireString(body.episodeId, "episodeId", 2, 120),
    contextVersionId: requireString(body.contextVersionId, "contextVersionId", 2, 120),
  };

  req.body = parsed;
};

export const validateUpdateTable = (req: Request): void => {
  const body = getBody(req);
  const status =
    body.status === undefined
      ? undefined
      : (requireString(body.status, "status", 5, 20).toUpperCase() as TableStatus);

  if (status && !["DRAFT", "RECRUITING", "PREPARED"].includes(status)) {
    throw new AppError(400, "Status de mesa invalido para o Pacote 02.", "INVALID_TABLE_STATUS");
  }

  const parsed: UpdateTableInput = {
    name: optionalString(body.name, "name", 2, 80),
    description: optionalString(body.description, "description", 1, 2000),
    status: status as UpdateTableInput["status"],
  };

  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizar mesa.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateCreateTableInvitation = (req: Request): void => {
  const body = getBody(req);
  const role =
    body.role === undefined ? "PLAYER" : requireString(body.role, "role", 6, 6).toUpperCase();

  if (role !== "PLAYER") {
    throw new AppError(400, "Pacote 02 permite convite apenas para PLAYER.", "INVALID_TABLE_INVITATION_ROLE");
  }

  const parsed: CreateTableInvitationInput = {
    email: requireEmail(body.email, "email"),
    role: "PLAYER",
    expiresInHours:
      body.expiresInHours === undefined
        ? undefined
        : requirePositiveInt(body.expiresInHours, "expiresInHours", { min: 1, max: 720 }),
  };

  req.body = parsed;
};

export const validateAcceptTableInvitation = (req: Request): void => {
  const body = getBody(req);
  const parsed: AcceptTableInvitationInput = {
    token: requireString(body.token, "token", 20, 200),
  };

  req.body = parsed;
};

export const validateCreatePackage03Character = (req: Request): void => {
  req.body = parseCharacterSheetInput(getBody(req));
};

export const validateUpdatePackage03Character = (req: Request): void => {
  const parsed = parseCharacterSheetInput(getBody(req));
  if (Object.values(parsed).every((value) => value === undefined)) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizar personagem.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};

export const validateUpsertCharacterEpisodeAnswers = (req: Request): void => {
  const body = getBody(req);
  if (!Array.isArray(body.answers) || body.answers.length < 1 || body.answers.length > 20) {
    throw new AppError(400, "answers deve conter entre 1 e 20 respostas.", "VALIDATION_ERROR");
  }

  const seen = new Set<string>();
  const answers: CharacterEpisodeAnswerInput[] = body.answers.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError(400, `Resposta ${index + 1} invalida.`, "VALIDATION_ERROR");
    }

    const value = entry as Record<string, unknown>;
    const questionKey = requireStableKey(value.questionKey, "questionKey");
    if (seen.has(questionKey)) {
      throw new AppError(409, "Chave de pergunta duplicada no payload.", "DUPLICATE_EPISODE_ANSWER");
    }
    seen.add(questionKey);

    return {
      questionKey,
      promptSnapshot: optionalString(value.promptSnapshot, "promptSnapshot", 1, 1000),
      answer: requireString(value.answer, "answer", 1, 8000),
    };
  });

  req.body = { answers };
};

export const validateReviewPackage03Character = (req: Request): void => {
  const body = getBody(req);
  const parsed: ReviewCharacterInput = {
    reason: optionalString(body.reason ?? body.comment, "reason", 1, 2000),
    expectedRevision:
      body.expectedRevision === undefined
        ? undefined
        : requirePositiveInt(body.expectedRevision, "expectedRevision", { min: 1, max: 10000 }),
  };

  req.body = parsed;
};

export const validateDeletePilotCharacter = (req: Request): void => {
  const body = getBody(req);
  req.body = { reason: requireString(body.reason, "reason", 3, 500) };
};

const parseCharacterSheetInput = (body: Record<string, unknown>): CharacterSheetInput => {
  assertForbiddenCharacterClientFields(body);
  return {
    name: optionalString(body.name ?? body.nome, "name", 1, 80),
    concept: optionalString(body.concept, "concept", 1, 2000),
    origin: optionalString(body.origin, "origin", 1, 2000),
    appearance: optionalString(body.appearance, "appearance", 1, 2000),
    desire: optionalString(body.desire, "desire", 1, 2000),
    fear: optionalString(body.fear, "fear", 1, 2000),
    promiseOrGuilt: optionalString(body.promiseOrGuilt, "promiseOrGuilt", 1, 2000),
    reasonToActWithGroup: optionalString(body.reasonToActWithGroup, "reasonToActWithGroup", 1, 2000),
    markLocation: optionalString(body.markLocation, "markLocation", 1, 500),
    markAppearance: optionalString(body.markAppearance, "markAppearance", 1, 1000),
    markReaction: optionalString(body.markReaction, "markReaction", 1, 1000),
    markAttitude: optionalString(body.markAttitude, "markAttitude", 1, 1000),
    archetypeKey:
      body.archetypeKey === undefined ? undefined : requireStableKey(body.archetypeKey, "archetypeKey"),
    attributes: body.attributes,
    trainings: body.trainings,
    positiveTrait: body.positiveTrait,
    negativeTrait: body.negativeTrait,
    narrativeBond: optionalString(body.narrativeBond, "narrativeBond", 1, 2000),
    personalHistory: optionalString(body.personalHistory, "personalHistory", 1, 8000),
    initialEquipment: body.initialEquipment,
    creativeDossier: optionalJsonObject(body.creativeDossier, "creativeDossier"),
    narrativeResponses: optionalJsonObject(body.narrativeResponses, "narrativeResponses"),
    confirmedNarrativeContext: optionalJsonObject(
      body.confirmedNarrativeContext,
      "confirmedNarrativeContext"
    ),
    playStylePreference: optionalString(body.playStylePreference, "playStylePreference", 2, 80),
  };
};

const requireStableKey = (value: unknown, fieldName: string): string => {
  const parsed = requireString(value, fieldName, 2, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(parsed)) {
    throw new AppError(400, `Campo ${fieldName} deve ser identificador estavel.`, "VALIDATION_ERROR");
  }

  return parsed;
};

const assertForbiddenCharacterClientFields = (body: Record<string, unknown>): void => {
  const forbidden = [
    "id",
    "userId",
    "ownerUserId",
    "tableId",
    "sheetStatus",
    "sheetRevision",
    "submittedRevision",
    "submittedAt",
    "approvedAt",
    "approvedById",
    "approvedBy",
    "builderConfigVersion",
    "reviewerUserId",
    "derived",
    "derivedValues",
    "derivedStats",
  ];

  for (const key of forbidden) {
    if (body[key] !== undefined) {
      throw new AppError(400, `Campo ${key} nao pode ser enviado pelo cliente.`, "FORBIDDEN_CHARACTER_FIELD");
    }
  }
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
  const characterCreationCriteria =
    body.characterCreationCriteria ?? body.characterCriteria;
  const parsed: UpsertTableWorldInput = {
    campaignTitle: requireString(
      body.campaignTitle ?? body.title,
      "campaignTitle",
      2,
      120
    ),
    summary: requireString(body.summary, "summary", 1, 4000),
    tone: optionalString(body.tone, "tone", 1, 120),
    rules: optionalJsonTextOrObject(body.rules, "rules"),
    characterCreationCriteria: optionalJsonTextOrObject(
      characterCreationCriteria,
      "characterCreationCriteria"
    ),
  };

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

export const validateCreateCharacterTraitSuggestion = (req: Request): void => {
  const body = getBody(req);
  const type = requireString(body.type, "type", 7, 20) as CharacterTraitType;
  const source =
    body.source === undefined
      ? undefined
      : (requireString(body.source, "source", 2, 20).toUpperCase() as CharacterTraitSuggestionSource);

  if (!["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(type)) {
    throw new AppError(400, "Tipo de sugestao invalido.", "VALIDATION_ERROR");
  }

  if (source && !TRAIT_SUGGESTION_SOURCES.includes(source)) {
    throw new AppError(400, "Fonte de sugestao invalida.", "VALIDATION_ERROR");
  }

  req.body = {
    type,
    name: requireString(body.name, "name", 2, 80),
    description: optionalString(body.description, "description", 1, 1000),
    category: optionalString(body.category, "category", 1, 80),
    value: optionalString(body.value, "value", 1, 500),
    source,
  } satisfies CreateCharacterTraitSuggestionInput;
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

export const validateListTableSubmissions = (req: Request): void => {
  const rawStatus = req.query.status;

  if (Array.isArray(rawStatus)) {
    throw new AppError(400, "Parametros de consulta invalidos.", "VALIDATION_ERROR");
  }

  const status =
    rawStatus === undefined
      ? undefined
      : (requireString(rawStatus, "status", 7, 20).toUpperCase() as TableMissionSubmissionStatus);

  if (status && !SUBMISSION_STATUSES.includes(status)) {
    throw new AppError(400, "Status de submissao invalido.", "VALIDATION_ERROR");
  }

  setNormalizedQuery(req, parseCursorPagination(req), { status });
};

export const getListTableSubmissionsQuery = (req: Request): ListTableSubmissionsQuery => ({
  status: req.query.status as TableMissionSubmissionStatus | undefined,
  cursor: req.query.cursor as string | undefined,
  limit: Number(req.query.limit ?? 20),
});

export const validateListTableCharacters = (req: Request): void => {
  const rawStatus = req.query.reviewStatus;
  if (Array.isArray(rawStatus)) {
    throw new AppError(400, "Parametros de consulta invalidos.", "VALIDATION_ERROR");
  }

  const reviewStatus =
    rawStatus === undefined
      ? undefined
      : (requireString(rawStatus, "reviewStatus", 7, 20).toUpperCase() as CharacterReviewStatus);

  if (reviewStatus && !CHARACTER_REVIEW_STATUSES.includes(reviewStatus)) {
    throw new AppError(400, "Status de revisao invalido.", "VALIDATION_ERROR");
  }

  setNormalizedQuery(req, parseCursorPagination(req), { reviewStatus });
};

export const getListTableCharactersQuery = (req: Request): ListTableCharactersQuery => ({
  reviewStatus: req.query.reviewStatus as CharacterReviewStatus | undefined,
  cursor: req.query.cursor as string | undefined,
  limit: Number(req.query.limit ?? 20),
});

export const validateListTableMissions = (req: Request): void => {
  const rawStatus = req.query.status;
  if (Array.isArray(rawStatus)) {
    throw new AppError(400, "Parametros de consulta invalidos.", "VALIDATION_ERROR");
  }

  const status =
    rawStatus === undefined
      ? undefined
      : (requireString(rawStatus, "status", 6, 20).toUpperCase() as TableMissionStatus);

  if (status && !MISSION_STATUSES.includes(status)) {
    throw new AppError(400, "Status de missao invalido.", "VALIDATION_ERROR");
  }

  setNormalizedQuery(req, parseCursorPagination(req), { status });
};

export const getListTableMissionsQuery = (req: Request): ListTableMissionsQuery => ({
  status: req.query.status as TableMissionStatus | undefined,
  cursor: req.query.cursor as string | undefined,
  limit: Number(req.query.limit ?? 20),
});

export const validateListTableTimeline = (req: Request): void => {
  setNormalizedQuery(req, parseCursorPagination(req));
};

export const getListTableTimelineQuery = (req: Request): ListTableTimelineQuery => ({
  cursor: req.query.cursor as string | undefined,
  limit: Number(req.query.limit ?? 20),
});

export const validateListCharacterTraits = (req: Request): void => {
  setNormalizedQuery(req, parseCursorPagination(req));
};

export const getListCharacterTraitsQuery = (req: Request): ListCharacterTraitsQuery => ({
  cursor: req.query.cursor as string | undefined,
  limit: Number(req.query.limit ?? 20),
});

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
