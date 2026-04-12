export const AWAKEN_LEVEL_REQUIREMENT = 30;
export const AWAKEN_ITEM_TYPE = "awakening_token";

const BASE_CLASS_BRANCHES: Record<string, string[]> = {
  Warrior: ["Paladin", "Berserker"],
  Mage: ["Sorcerer", "Cleric"],
  Rogue: ["Ranger", "Assassin"],
};

export const getXpRequiredForNextLevel = (level: number) => {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 + (safeLevel - 1) * 50;
};

export const getTotalXpForLevel = (level: number) => {
  const safeLevel = Math.max(1, Math.floor(level));
  let total = 0;

  for (let currentLevel = 1; currentLevel < safeLevel; currentLevel += 1) {
    total += getXpRequiredForNextLevel(currentLevel);
  }

  return total;
};

export const getLevelFromXp = (xp: number) => {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;

  while (getTotalXpForLevel(level + 1) <= safeXp) {
    level += 1;
  }

  return level;
};

export const getXpProgression = (xp: number) => {
  const safeXp = Math.max(0, Math.floor(xp));
  const currentLevel = getLevelFromXp(safeXp);
  const currentLevelFloorXp = getTotalXpForLevel(currentLevel);
  const nextLevelFloorXp = getTotalXpForLevel(currentLevel + 1);
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

export const getAwakeningTargetsByClassName = (className: string) => {
  return BASE_CLASS_BRANCHES[className] ?? [];
};

export const isBaseClass = (className: string) => {
  return className in BASE_CLASS_BRANCHES;
};

export const isAwakenedClass = (className: string) => {
  return Object.values(BASE_CLASS_BRANCHES).some((targets) => targets.includes(className));
};
