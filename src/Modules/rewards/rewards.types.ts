export interface ClaimRewardInput {
  characterId: string;
  claimKey: string;
  type: "COINS" | "XP";
  value: number;
  metadata?: string;
}
