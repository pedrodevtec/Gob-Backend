import { Prisma } from "@prisma/client";

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
