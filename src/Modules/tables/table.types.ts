import {
  CharacterReviewStatus,
  CharacterTraitSuggestionSource,
  CharacterTraitType,
  Prisma,
  TableMissionStatus,
  TableMissionSubmissionStatus,
  TableTimelineEventType,
} from "@prisma/client";
import { CreateCharacterInput } from "../characters/character.types";

export interface CreateTableInput {
  name: string;
  description?: string;
  settingId: string;
  episodeId: string;
  contextVersionId: string;
}

export interface UpdateTableInput {
  name?: string;
  description?: string;
  status?: "DRAFT" | "RECRUITING" | "PREPARED";
}

export interface CreateTableInvitationInput {
  email: string;
  role: "PLAYER";
  expiresInHours?: number;
}

export interface AcceptTableInvitationInput {
  token: string;
}

export interface CharacterSheetInput {
  name?: string;
  concept?: string;
  origin?: string;
  appearance?: string;
  desire?: string;
  fear?: string;
  promiseOrGuilt?: string;
  reasonToActWithGroup?: string;
  markLocation?: string;
  markAppearance?: string;
  markReaction?: string;
  markAttitude?: string;
  archetypeKey?: string;
  attributes?: unknown;
  trainings?: unknown;
  positiveTrait?: unknown;
  negativeTrait?: unknown;
  narrativeBond?: string;
  personalHistory?: string;
  initialEquipment?: unknown;
  creativeDossier?: Prisma.InputJsonValue;
  narrativeResponses?: Prisma.InputJsonObject;
  confirmedNarrativeContext?: Prisma.InputJsonObject;
  playStylePreference?: string;
}

export interface CharacterEpisodeAnswerInput {
  questionKey: string;
  promptSnapshot?: string;
  answer: string;
}

export interface ReviewCharacterInput {
  reason?: string;
  expectedRevision?: number;
}

export interface JoinTableInput {
  joinCode: string;
}

export interface UpsertTableWorldInput {
  campaignTitle: string;
  summary: string;
  tone?: string;
  rules?: Prisma.InputJsonValue;
  characterCreationCriteria?: Prisma.InputJsonValue;
}

export type CreateTableCharacterInput = CreateCharacterInput;

export interface ReviewTableCharacterInput {
  status: "APPROVED" | "REJECTED" | "NEEDS_CHANGES";
  masterFeedback?: string;
}

export interface CreateCharacterTraitInput {
  type: CharacterTraitType;
  name: string;
  description?: string;
}

export interface CreateCharacterTraitSuggestionInput {
  type: CharacterTraitType;
  name: string;
  description?: string;
  category?: string;
  value?: string;
  source?: CharacterTraitSuggestionSource;
}

export interface CreateTableMissionInput {
  title: string;
  description: string;
  objective?: string;
  isRequired?: boolean;
  dueDate?: Date;
}

export interface UpdateTableMissionInput {
  title?: string;
  description?: string;
  objective?: string | null;
  isRequired?: boolean;
  status?: TableMissionStatus;
  dueDate?: Date | null;
}

export interface CreateMissionSubmissionInput {
  characterId: string;
  content: string;
}

export interface ReviewMissionSubmissionInput {
  status: Exclude<TableMissionSubmissionStatus, "SUBMITTED">;
  masterNote?: string;
}

export interface ListTableSubmissionsQuery {
  status?: TableMissionSubmissionStatus;
  cursor?: string;
  limit: number;
}

export interface CursorPaginationQuery {
  cursor?: string;
  limit: number;
}

export interface ListTableCharactersQuery extends CursorPaginationQuery {
  reviewStatus?: CharacterReviewStatus;
}

export interface ListTableMissionsQuery extends CursorPaginationQuery {
  status?: TableMissionStatus;
}

export type ListTableTimelineQuery = CursorPaginationQuery;
export type ListCharacterTraitsQuery = CursorPaginationQuery;

export interface CreateTimelineEventInput {
  characterId?: string;
  title: string;
  description: string;
  type: TableTimelineEventType;
}
