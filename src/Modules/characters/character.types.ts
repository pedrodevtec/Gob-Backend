export interface CreateCharacterInput {
  name: string;
  classId?: string;
}

export interface UpdateCharacterProfileInput {
  name?: string;
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
