import { applyClassPassives } from "./class.effects";

export type CharacterStateStatus = "READY" | "WOUNDED" | "DEFEATED";

export interface DerivedStats {
  attack: number;
  defense: number;
  maxHealth: number;
  critChance: number;
}

export interface PresentedStats extends DerivedStats {
  critChancePercent: number;
  descriptions: {
    attack: string;
    defense: string;
    maxHealth: string;
    critChance: string;
  };
}

export interface CombatRound {
  round: number;
  actor: "character" | "monster";
  damage: number;
  action?: "ATTACK" | "DEFEND" | "POWER_ATTACK";
  critical?: boolean;
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

export interface TurnBasedCombatActionConfig {
  attackMultiplier: number;
  defenseMultiplier: number;
  critEnabled: boolean;
}

export interface PvpCombatRound {
  round: number;
  actor: "challenger" | "opponent";
  damage: number;
  remainingChallengerHealth: number;
  remainingOpponentHealth: number;
  critical: boolean;
}

export interface PvpCombatResult {
  winner: "challenger" | "opponent";
  challengerHealthRemaining: number;
  opponentHealthRemaining: number;
  challengerStats: DerivedStats;
  opponentStats: DerivedStats;
  rounds: PvpCombatRound[];
}

export interface AvailabilityResult {
  available: boolean;
  nextAvailableAt: Date | null;
}

export interface CharacterStatsInput {
  level: number;
  classModifier: string;
  className?: string;
  equipmentEffects?: Array<string | null | undefined>;
  buffPercent?: number;
}

export interface CharacterStateInput {
  currentHealth: number;
  maxHealth: number;
}

export interface CombatCharacterStateInput extends CharacterStateInput {
  level: number;
}

const DEFAULT_CRIT_CHANCE = 0.08;

export const getCombatActionConfig = (
  action: "ATTACK" | "DEFEND" | "POWER_ATTACK"
): TurnBasedCombatActionConfig => {
  if (action === "DEFEND") {
    return {
      attackMultiplier: 0.65,
      defenseMultiplier: 1.6,
      critEnabled: false,
    };
  }

  if (action === "POWER_ATTACK") {
    return {
      attackMultiplier: 1.35,
      defenseMultiplier: 0.8,
      critEnabled: true,
    };
  }

  return {
    attackMultiplier: 1,
    defenseMultiplier: 1,
    critEnabled: true,
  };
};

export const calculateCharacterTurnDamage = (
  stats: DerivedStats,
  enemyDefense: number,
  action: "ATTACK" | "DEFEND" | "POWER_ATTACK",
  randomFn: () => number = Math.random
) => {
  const actionConfig = getCombatActionConfig(action);
  const critical = actionConfig.critEnabled && randomFn() <= stats.critChance;
  const critBonus = critical ? 1.5 : 1;

  const damage = Math.max(
    1,
    Math.round(
      ((stats.attack * actionConfig.attackMultiplier) - enemyDefense + 6 + randomFn() * 4) * critBonus
    )
  );

  return { damage, critical, actionConfig };
};

export const calculateMonsterTurnDamage = (
  monsterAttack: number,
  stats: DerivedStats,
  action: "ATTACK" | "DEFEND" | "POWER_ATTACK",
  randomFn: () => number = Math.random
) => {
  const actionConfig = getCombatActionConfig(action);
  const effectiveDefense = Math.max(0, Math.round(stats.defense * actionConfig.defenseMultiplier));

  return Math.max(1, Math.round(monsterAttack - effectiveDefense + 4 + randomFn() * 4));
};

export const extractEffectModifiers = (effect: string) => {
  const modifiers = {
    attack: 0,
    defense: 0,
    maxHealth: 0,
    critChance: 0,
  };

  const matches = effect.toUpperCase().matchAll(/([+-]\d+)\s*(ATK|DEF|HP|CRIT)/g);

  for (const match of matches) {
    const amount = Number(match[1]);
    const stat = match[2];

    if (stat === "ATK") {
      modifiers.attack += amount;
    } else if (stat === "DEF") {
      modifiers.defense += amount;
    } else if (stat === "HP") {
      modifiers.maxHealth += amount;
    } else if (stat === "CRIT") {
      modifiers.critChance += amount / 100;
    }
  }

  return modifiers;
};

export const deriveCharacterStats = (input: CharacterStatsInput): DerivedStats => {
  let baseStats: DerivedStats = {
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
    const modifiers = extractEffectModifiers(effect);
    baseStats.attack += modifiers.attack;
    baseStats.defense += modifiers.defense;
    baseStats.maxHealth += modifiers.maxHealth;
    baseStats.critChance += modifiers.critChance;
  }

  baseStats = applyClassPassives(baseStats, input.className);

  if (input.buffPercent && input.buffPercent > 0) {
    const multiplier = 1 + input.buffPercent / 100;
    baseStats.attack = Math.max(1, Math.round(baseStats.attack * multiplier));
    baseStats.defense = Math.max(0, Math.round(baseStats.defense * multiplier));
    baseStats.maxHealth = Math.max(1, Math.round(baseStats.maxHealth * multiplier));
  }

  baseStats.attack = Math.max(1, Math.round(baseStats.attack));
  baseStats.defense = Math.max(0, Math.round(baseStats.defense));
  baseStats.maxHealth = Math.max(1, Math.round(baseStats.maxHealth));
  baseStats.critChance = Math.min(0.95, Math.max(0, Number(baseStats.critChance.toFixed(4))));

  return baseStats;
};

export const presentDerivedStats = (stats: DerivedStats): PresentedStats => {
  const critChancePercent = Number((stats.critChance * 100).toFixed(2));

  return {
    ...stats,
    critChancePercent,
    descriptions: {
      attack:
        `ATK define o dano base causado por ataque antes da defesa inimiga, variacao aleatoria e critico. ` +
        `Cada ponto extra de ATK aumenta sua pressao ofensiva de forma direta.`,
      defense:
        `DEF reduz o dano recebido em cada golpe inimigo. Quanto maior a DEF, menor a perda de HP por turno.`,
      maxHealth:
        `HP define a vida maxima do personagem e quanto dano total ele suporta antes de cair.`,
      critChance:
        `CRIT e a chance de um ataque causar dano critico. Atualmente ${critChancePercent}% de chance gera um golpe com multiplicador de 1.5x no dano.`,
    },
  };
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
      action: "ATTACK",
      critical: critBonus > 1,
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
      action: "ATTACK",
      critical: false,
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

export const resolvePvpCombat = (
  challengerState: CombatCharacterStateInput,
  challengerStats: DerivedStats,
  opponentState: CombatCharacterStateInput,
  opponentStats: DerivedStats,
  randomFn: () => number = Math.random
): PvpCombatResult => {
  let challengerHealth = Math.min(challengerState.currentHealth, challengerStats.maxHealth);
  let opponentHealth = Math.min(opponentState.currentHealth, opponentStats.maxHealth);
  const rounds: PvpCombatRound[] = [];
  const effectiveMaxRounds =
    12 + Math.max(0, Math.abs(challengerState.level - opponentState.level));

  for (let index = 0; index < effectiveMaxRounds; index += 1) {
    const challengerCrit = randomFn() <= challengerStats.critChance;
    const challengerDamage = Math.max(
      1,
      Math.round(
        (challengerStats.attack - opponentStats.defense + 6 + randomFn() * 4) *
          (challengerCrit ? 1.5 : 1)
      )
    );
    opponentHealth = Math.max(0, opponentHealth - challengerDamage);

    rounds.push({
      round: index + 1,
      actor: "challenger",
      damage: challengerDamage,
      remainingChallengerHealth: challengerHealth,
      remainingOpponentHealth: opponentHealth,
      critical: challengerCrit,
    });

    if (opponentHealth <= 0) {
      return {
        winner: "challenger",
        challengerHealthRemaining: challengerHealth,
        opponentHealthRemaining: opponentHealth,
        challengerStats,
        opponentStats,
        rounds,
      };
    }

    const opponentCrit = randomFn() <= opponentStats.critChance;
    const opponentDamage = Math.max(
      1,
      Math.round(
        (opponentStats.attack - challengerStats.defense + 6 + randomFn() * 4) *
          (opponentCrit ? 1.5 : 1)
      )
    );
    challengerHealth = Math.max(0, challengerHealth - opponentDamage);

    rounds.push({
      round: index + 1,
      actor: "opponent",
      damage: opponentDamage,
      remainingChallengerHealth: challengerHealth,
      remainingOpponentHealth: opponentHealth,
      critical: opponentCrit,
    });

    if (challengerHealth <= 0) {
      return {
        winner: "opponent",
        challengerHealthRemaining: challengerHealth,
        opponentHealthRemaining: opponentHealth,
        challengerStats,
        opponentStats,
        rounds,
      };
    }
  }

  const winner = challengerHealth >= opponentHealth ? "challenger" : "opponent";

  return {
    winner,
    challengerHealthRemaining: challengerHealth,
    opponentHealthRemaining: opponentHealth,
    challengerStats,
    opponentStats,
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
