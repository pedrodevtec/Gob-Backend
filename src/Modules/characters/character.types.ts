import { Prisma } from "@prisma/client";

export interface CreateCharacterInput {
  name: string;
  classId?: string;
  creativeDossier?: Prisma.InputJsonValue;
}

export interface UpdateCharacterProfileInput {
  name?: string;
  creativeDossier?: Prisma.InputJsonValue;
}

export interface UpdateCharacterProgressInput {
  xp?: number;
  level?: number;
  lastCheckpoint?: string;
}

export interface UpdateCharacterPositionInput {
  posX?: number;
  posY?: number;
  posZ?: number;
  lastCheckpoint?: string;
}

export interface UpdateCharacterCustomizationInput {
  avatarId?: string;
  titleId?: string;
  bannerId?: string;
}

export interface AwakenCharacterInput {
  targetClassId: string;
}
