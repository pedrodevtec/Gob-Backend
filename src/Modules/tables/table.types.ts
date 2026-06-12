import { Prisma } from "@prisma/client";
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
