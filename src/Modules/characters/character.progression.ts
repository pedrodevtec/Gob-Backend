export const AWAKEN_ITEM_TYPE = "awakening_token";
export const MAX_CHARACTER_LEVEL = 60;
const AWAKEN_LEVEL_REQUIREMENTS_BY_TIER: Record<number, number> = {
  1: 25,
  2: 45,
};

export const getXpRequiredForNextLevel = (level: number) => {
  const safeLevel = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level)));
  return 100 + (safeLevel - 1) * 50;
};

export const getTotalXpForLevel = (level: number) => {
  const safeLevel = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level)));
  let total = 0;

  for (let currentLevel = 1; currentLevel < safeLevel; currentLevel += 1) {
    total += getXpRequiredForNextLevel(currentLevel);
  }

  return total;
};

export const getLevelFromXp = (xp: number) => {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;

  while (level < MAX_CHARACTER_LEVEL && getTotalXpForLevel(level + 1) <= safeXp) {
    level += 1;
  }

  return level;
};

export const getXpProgression = (xp: number) => {
  const safeXp = Math.max(0, Math.floor(xp));
  const currentLevel = getLevelFromXp(safeXp);
  const currentLevelFloorXp = getTotalXpForLevel(currentLevel);
  const nextLevelFloorXp =
    currentLevel >= MAX_CHARACTER_LEVEL ? currentLevelFloorXp : getTotalXpForLevel(currentLevel + 1);
  const xpIntoLevel = safeXp - currentLevelFloorXp;
  const xpForNextLevel = nextLevelFloorXp - currentLevelFloorXp;

  return {
    currentLevel,
    currentLevelFloorXp,
    nextLevelFloorXp,
    xpIntoLevel,
    xpForNextLevel,
    xpRemainingToNextLevel: Math.max(0, nextLevelFloorXp - safeXp),
  };
};

export const getAwakenLevelRequirementForTier = (tier: number) => {
  return AWAKEN_LEVEL_REQUIREMENTS_BY_TIER[tier] ?? null;
};

export const isBaseClassTier = (tier: number) => {
  return tier <= 1;
};

export const isAwakenedClassTier = (tier: number) => {
  return tier > 1;
};
