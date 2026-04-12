import { DerivedStats } from "./combat.engine";

type ClassPassiveEffect = {
  attackMultiplier?: number;
  defenseMultiplier?: number;
  maxHealthMultiplier?: number;
  critChanceBonus?: number;
};

const CLASS_PASSIVES: Record<string, ClassPassiveEffect> = {
  Warrior: {
    defenseMultiplier: 1.1,
  },
  Berserker: {
    attackMultiplier: 1.15,
    defenseMultiplier: 0.92,
  },
  Paladin: {
    defenseMultiplier: 1.08,
    maxHealthMultiplier: 1.12,
  },
  Mage: {
    attackMultiplier: 1.15,
  },
  Sorcerer: {
    attackMultiplier: 1.1,
    critChanceBonus: 0.06,
  },
  Cleric: {
    defenseMultiplier: 1.1,
    maxHealthMultiplier: 1.08,
  },
  Rogue: {
    attackMultiplier: 1.08,
    critChanceBonus: 0.05,
  },
  Ranger: {
    attackMultiplier: 1.08,
    maxHealthMultiplier: 1.08,
  },
  Assassin: {
    attackMultiplier: 1.12,
    maxHealthMultiplier: 0.94,
    critChanceBonus: 0.1,
  },
};

export const applyClassPassives = (stats: DerivedStats, className?: string): DerivedStats => {
  if (!className) {
    return stats;
  }

  const effect = CLASS_PASSIVES[className];

  if (!effect) {
    return stats;
  }

  const nextStats: DerivedStats = {
    attack: stats.attack,
    defense: stats.defense,
    maxHealth: stats.maxHealth,
    critChance: stats.critChance,
  };

  if (effect.attackMultiplier) {
    nextStats.attack = Math.max(1, Math.round(nextStats.attack * effect.attackMultiplier));
  }

  if (effect.defenseMultiplier) {
    nextStats.defense = Math.max(0, Math.round(nextStats.defense * effect.defenseMultiplier));
  }

  if (effect.maxHealthMultiplier) {
    nextStats.maxHealth = Math.max(1, Math.round(nextStats.maxHealth * effect.maxHealthMultiplier));
  }

  if (effect.critChanceBonus) {
    nextStats.critChance += effect.critChanceBonus;
  }

  return nextStats;
};
