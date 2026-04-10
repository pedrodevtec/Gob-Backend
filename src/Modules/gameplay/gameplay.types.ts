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
}

export interface MarketActionInput {
  action: "barter" | "scavenge";
}
