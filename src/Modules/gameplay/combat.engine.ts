export type CharacterStateStatus = "READY" | "WOUNDED" | "DEFEATED";

export interface DerivedStats {
  attack: number;
  defense: number;
  maxHealth: number;
  critChance: number;
}

export interface CombatRound {
  round: number;
  actor: "character" | "monster";
  damage: number;
  remainingEnemyHealth?: number;
  remainingCharacterHealth?: number;
}

export interface CombatResult {
  victory: boolean;
  characterHealthRemaining: number;
  enemyHealthRemaining: number;
  stats: DerivedStats;
  rounds: CombatRound[];
}

export interface AvailabilityResult {
  available: boolean;
  nextAvailableAt: Date | null;
}

export interface CharacterStatsInput {
  level: number;
  classModifier: string;
  equipmentEffects?: Array<string | null | undefined>;
}

export interface CharacterStateInput {
  currentHealth: number;
  maxHealth: number;
}

export interface CombatCharacterStateInput extends CharacterStateInput {
  level: number;
}

const DEFAULT_CRIT_CHANCE = 0.08;

export const extractEffectValue = (effect: string) => {
  const matched = effect.match(/(\d+)/);
  return matched ? Number(matched[1]) : 0;
};

export const deriveCharacterStats = (input: CharacterStatsInput): DerivedStats => {
  const baseStats: DerivedStats = {
    attack: 10 + input.level * 3,
    defense: 6 + input.level * 2,
    maxHealth: 70 + input.level * 18,
    critChance: DEFAULT_CRIT_CHANCE,
  };

  const modifier = input.classModifier.toUpperCase();

  if (modifier === "STR") {
    baseStats.attack += 6;
    baseStats.defense += 4;
    baseStats.maxHealth += 18;
  } else if (modifier === "INT") {
    baseStats.attack += 8;
    baseStats.defense += 2;
    baseStats.maxHealth += 10;
  } else if (modifier === "DEX") {
    baseStats.attack += 5;
    baseStats.defense += 3;
    baseStats.maxHealth += 12;
    baseStats.critChance += 0.1;
  }

  for (const effectEntry of input.equipmentEffects ?? []) {
    const effect = effectEntry ?? "";
    const amount = extractEffectValue(effect);

    if (effect.toUpperCase().includes("ATK")) {
      baseStats.attack += amount;
    }

    if (effect.toUpperCase().includes("DEF")) {
      baseStats.defense += amount;
    }

    if (effect.toUpperCase().includes("HP")) {
      baseStats.maxHealth += amount;
    }
  }

  return baseStats;
};

export const deriveCharacterState = (
  input: CharacterStateInput
): { currentHealth: number; status: CharacterStateStatus } => {
  const currentHealth = Math.min(input.maxHealth, Math.max(0, Math.round(input.currentHealth)));

  if (currentHealth <= 0) {
    return { currentHealth: 0, status: "DEFEATED" };
  }

  if (currentHealth < input.maxHealth) {
    return { currentHealth, status: "WOUNDED" };
  }

  return { currentHealth, status: "READY" };
};

export const resolveCombat = (
  characterState: CombatCharacterStateInput,
  stats: DerivedStats,
  monster: {
    name: string;
    level: number;
    health: number;
    attack: number;
    defense: number;
  },
  randomFn: () => number = Math.random
): CombatResult => {
  let characterHealth = Math.min(characterState.currentHealth, stats.maxHealth);
  let monsterHealth = monster.health;
  const rounds: CombatRound[] = [];
  const effectiveMaxRounds = 8 + Math.max(0, characterState.level - monster.level);

  for (let index = 0; index < effectiveMaxRounds; index += 1) {
    const critRoll = randomFn();
    const critBonus = critRoll <= stats.critChance ? 1.5 : 1;
    const characterDamage = Math.max(
      1,
      Math.round((stats.attack - monster.defense + 6 + randomFn() * 4) * critBonus)
    );
    monsterHealth = Math.max(0, monsterHealth - characterDamage);

    rounds.push({
      round: index + 1,
      actor: "character",
      damage: characterDamage,
      remainingEnemyHealth: monsterHealth,
    });

    if (monsterHealth <= 0) {
      break;
    }

    const monsterDamage = Math.max(
      1,
      Math.round(monster.attack - stats.defense + 4 + randomFn() * 4)
    );
    characterHealth = Math.max(0, characterHealth - monsterDamage);

    rounds.push({
      round: index + 1,
      actor: "monster",
      damage: monsterDamage,
      remainingCharacterHealth: characterHealth,
    });

    if (characterHealth <= 0) {
      break;
    }
  }

  const victory = monsterHealth <= 0 && characterHealth > 0;

  return {
    victory,
    characterHealthRemaining: characterHealth,
    enemyHealthRemaining: monsterHealth,
    stats,
    rounds,
  };
};

export const getCooldownAvailability = (
  lastPerformedAt: Date | null | undefined,
  cooldownSeconds: number,
  now: Date = new Date()
): AvailabilityResult => {
  if (!lastPerformedAt || cooldownSeconds <= 0) {
    return { available: true, nextAvailableAt: null };
  }

  const nextAvailableAt = new Date(lastPerformedAt.getTime() + cooldownSeconds * 1000);
  return {
    available: nextAvailableAt <= now,
    nextAvailableAt,
  };
};

export const getStatusLabel = (
  currentHealth: number,
  maxHealth: number
): CharacterStateStatus => deriveCharacterState({ currentHealth, maxHealth }).status;

export const getRepeatWindowAvailability = (
  lastPerformedAt: Date | null | undefined,
  repeatWindowSeconds: number,
  now: Date = new Date()
): AvailabilityResult => getCooldownAvailability(lastPerformedAt, repeatWindowSeconds, now);
