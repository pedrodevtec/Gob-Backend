import {
  CharacterReviewStatus,
  CharacterTraitType,
  Prisma,
  TableMissionStatus,
  TableMissionSubmissionStatus,
  TableTimelineEventType,
} from "@prisma/client";
import { CreateCharacterInput } from "../characters/character.types";

export interface CreateTableInput {
  name: string;
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
