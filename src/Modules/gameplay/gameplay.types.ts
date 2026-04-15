import { MissionJourneyInput, MissionJourneyNodeInput } from "../admin/admin.types";

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

export interface StartMissionJourneyInput {
  missionId: string;
  npcId: string;
}

export interface ProgressMissionJourneyInput {
  choiceId?: string;
  npcId?: string;
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

export interface CombatTurnInput {
  action: "ATTACK" | "DEFEND" | "POWER_ATTACK";
}

export interface MissionJourneyDefinition extends MissionJourneyInput {}
export interface MissionJourneyNode extends MissionJourneyNodeInput {}
