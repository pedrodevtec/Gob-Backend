export interface CreateMonsterInput {
  name: string;
  level: number;
  health: number;
  attack: number;
  defense: number;
  experience: number;
}

export interface UpdateMonsterInput extends Partial<CreateMonsterInput> {}

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
  assetKind: "ITEM" | "EQUIPMENT" | "COINS";
  price: number;
  currency?: string;
  rewardCoins?: number;
  rewardQuantity?: number;
  isActive?: boolean;
}

export interface UpdateShopProductInput extends Partial<CreateShopProductInput> {}
