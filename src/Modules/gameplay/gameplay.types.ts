export type GameplayActionType =
  | "BOUNTY_HUNT"
  | "MISSION"
  | "TRAINING"
  | "NPC_INTERACTION"
  | "MARKET";

export interface BountyHuntInput {
  bountyId: string;
}

export interface MissionInput {
  missionId: string;
}

export interface TrainingInput {
  trainingId: string;
}

export interface NpcInteractionInput {
  npcId: string;
  buffPercent?: 2 | 4 | 6;
}

export interface MarketActionInput {
  action: "barter" | "scavenge";
}
