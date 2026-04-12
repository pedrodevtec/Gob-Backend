import assert from "node:assert/strict";
import {
  deriveCharacterState,
  deriveCharacterStats,
  getCooldownAvailability,
  getRepeatWindowAvailability,
  resolveCombat,
} from "../combat.engine";

const run = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

run("deriveCharacterStats aplica modificadores de classe e equipamentos", () => {
  const stats = deriveCharacterStats({
    level: 3,
    classModifier: "DEX",
    equipmentEffects: ["+5 ATK", "+7 HP", "+2 DEF"],
  });

  assert.equal(stats.attack, 29);
  assert.equal(stats.defense, 17);
  assert.equal(stats.maxHealth, 143);
  assert.equal(stats.critChance, 0.18);
});

run("deriveCharacterStats aplica passiva de classe por nome", () => {
  const stats = deriveCharacterStats({
    level: 10,
    className: "Paladin",
    classModifier: "STR",
  });

  assert.equal(stats.attack, 46);
  assert.equal(stats.defense, 32);
  assert.equal(stats.maxHealth, 300);
  assert.equal(stats.critChance, 0.08);
});

run("deriveCharacterStats aplica tradeoff ofensivo de Assassin", () => {
  const stats = deriveCharacterStats({
    level: 10,
    className: "Assassin",
    classModifier: "DEX",
  });

  assert.equal(stats.attack, 50);
  assert.equal(stats.defense, 29);
  assert.equal(stats.maxHealth, 246);
  assert.equal(stats.critChance, 0.28);
});

run("deriveCharacterStats aplica buff percentual aos atributos base", () => {
  const stats = deriveCharacterStats({
    level: 3,
    classModifier: "STR",
    equipmentEffects: ["+5 ATK"],
    buffPercent: 4,
  });

  assert.equal(stats.attack, 31);
  assert.equal(stats.defense, 17);
  assert.equal(stats.maxHealth, 148);
});

run("deriveCharacterState marca personagem derrotado quando hp chega a zero", () => {
  const state = deriveCharacterState({
    currentHealth: -4,
    maxHealth: 120,
  });

  assert.deepEqual(state, {
    currentHealth: 0,
    status: "DEFEATED",
  });
});

run("resolveCombat respeita hp persistido como vida inicial", () => {
  const stats = deriveCharacterStats({
    level: 2,
    classModifier: "STR",
  });
  const sequence = [0.99, 0.4, 0.99, 0.4, 0.99, 0.4, 0.99, 0.4];
  let index = 0;

  const result = resolveCombat(
    {
      level: 2,
      currentHealth: 12,
      maxHealth: stats.maxHealth,
    },
    stats,
    {
      name: "Bandido",
      level: 3,
      health: 40,
      attack: 18,
      defense: 8,
    },
    () => sequence[index++] ?? 0.5
  );

  assert.equal(result.victory, false);
  assert.equal(result.characterHealthRemaining, 0);
  assert.ok(result.rounds.length >= 2);
});

run("cooldown informa proxima disponibilidade", () => {
  const now = new Date("2026-04-11T12:00:00.000Z");
  const lastPerformedAt = new Date("2026-04-11T11:55:30.000Z");

  const availability = getCooldownAvailability(lastPerformedAt, 300, now);

  assert.equal(availability.available, false);
  assert.equal(availability.nextAvailableAt?.toISOString(), "2026-04-11T12:00:30.000Z");
});

run("repeat window libera acao quando a janela expira", () => {
  const now = new Date("2026-04-11T12:00:00.000Z");
  const lastPerformedAt = new Date("2026-04-11T11:20:00.000Z");

  const availability = getRepeatWindowAvailability(lastPerformedAt, 1800, now);

  assert.equal(availability.available, true);
  assert.equal(availability.nextAvailableAt?.toISOString(), "2026-04-11T11:50:00.000Z");
});

console.log("Combat tests completed.");
