export interface CreateMonsterInput {
  name: string;
  description?: string;
  imageUrl?: string;
  level: number;
  health: number;
  attack: number;
  defense: number;
  experience: number;
}

export interface UpdateMonsterInput extends Partial<CreateMonsterInput> {}

export type MissionJourneyNodeType =
  | "DIALOGUE"
  | "CHOICE"
  | "COMBAT"
  | "RETURN_TO_NPC"
  | "COMPLETE";

export interface MissionJourneyChoiceInput {
  id: string;
  label: string;
  description?: string;
  nextNodeId: string;
}

export interface MissionJourneyEnemyInput {
  name: string;
  imageUrl?: string;
  level: number;
  health: number;
  attack: number;
  defense: number;
}

export interface MissionJourneyNodeInput {
  id: string;
  type: MissionJourneyNodeType;
  title?: string;
  text?: string;
  nextNodeId?: string;
  npcId?: string;
  enemy?: MissionJourneyEnemyInput;
  choices?: MissionJourneyChoiceInput[];
}

export interface MissionJourneyInput {
  startNodeId: string;
  nodes: MissionJourneyNodeInput[];
}

export interface CreateBountyInput {
  title: string;
  description?: string;
  monsterId: string;
  recommendedLevel: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "ELITE";
  reward: number;
  rewardXp: number;
  rewardItemName?: string;
  rewardItemCategory?: string;
  rewardItemType?: string;
  rewardItemImg?: string;
  rewardItemEffect?: string;
  rewardItemValue?: number;
  rewardItemQuantity?: number;
  timeLimit: string;
  status: string;
  isActive?: boolean;
}

export interface UpdateBountyInput extends Partial<CreateBountyInput> {}

export interface CreateMissionInput {
  title: string;
  description?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "ELITE";
  recommendedLevel: number;
  imageUrl?: string;
  startNpcId?: string;
  completionNpcId?: string;
  startDialogue?: string;
  completionDialogue?: string;
  repeatCooldownSeconds?: number;
  journey?: MissionJourneyInput;
  enemyName: string;
  enemyLevel: number;
  enemyHealth: number;
  enemyAttack: number;
  enemyDefense: number;
  rewardXp: number;
  rewardCoins: number;
  rewardItemName?: string;
  rewardItemCategory?: string;
  rewardItemType?: string;
  rewardItemImg?: string;
  rewardItemEffect?: string;
  rewardItemValue?: number;
  rewardItemQuantity?: number;
  isActive?: boolean;
}

export interface UpdateMissionInput extends Partial<CreateMissionInput> {}

export interface CreateTrainingInput {
  name: string;
  description?: string;
  trainingType: string;
  xpReward: number;
  coinsReward?: number;
  cooldownSeconds?: number;
  isActive?: boolean;
}

export interface UpdateTrainingInput extends Partial<CreateTrainingInput> {}

export interface CreateNpcInput {
  name: string;
  role: string;
  interactionType: string;
  imageUrl?: string;
  description?: string;
  dialogue?: string;
  xpReward?: number;
  coinsReward?: number;
  rewardItemName?: string;
  rewardItemCategory?: string;
  rewardItemType?: string;
  rewardItemImg?: string;
  rewardItemEffect?: string;
  rewardItemValue?: number;
  rewardItemQuantity?: number;
  isActive?: boolean;
}

export interface UpdateNpcInput extends Partial<CreateNpcInput> {}

export interface CreateShopProductInput {
  slug: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  img: string;
  effect?: string;
  levelRequirement?: number;
  assetKind: "ITEM" | "EQUIPMENT" | "COINS";
  price: number;
  currency?: string;
  rewardCoins?: number;
  rewardQuantity?: number;
  isActive?: boolean;
}

export interface UpdateShopProductInput extends Partial<CreateShopProductInput> {}
