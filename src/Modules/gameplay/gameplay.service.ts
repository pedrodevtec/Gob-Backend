import { Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import {
  BountyHuntInput,
  MarketActionInput,
  MissionInput,
  NpcInteractionInput,
  TrainingInput,
} from "./gameplay.types";

interface DerivedStats {
  attack: number;
  defense: number;
  maxHealth: number;
  critChance: number;
}

interface CombatReward {
  xp: number;
  coins: number;
  item?: {
    name: string;
    value: number;
    category: string;
    type: string;
    img: string;
    effect?: string;
    quantity: number;
  };
}

type GameplayCharacterBase = Prisma.CharacterGetPayload<{
  include: {
    class: true;
    inventory: {
      include: {
        items: true;
        equipments: true;
      };
    };
  };
}>;

type GameplayCharacter = Omit<GameplayCharacterBase, "inventory"> & {
  inventory: NonNullable<GameplayCharacterBase["inventory"]>;
};

export class GameplayService {
  static async getJourneyOptions() {
    return {
      onboarding: ["REGISTER", "LOGIN", "CREATE_CHARACTER", "CHOOSE_CLASS"],
      activities: [
        {
          key: "BOUNTY_HUNT",
          label: "Bounty Hunt",
          description: "Combate direto contra monstros para ganhar XP, coins e loot.",
        },
        {
          key: "MISSION",
          label: "Missoes",
          description: "Desafios de risco variavel com combate e recompensas escaladas.",
        },
        {
          key: "TRAINING",
          label: "Treinamentos",
          description: "Evolui o personagem com XP e reforco da progressao.",
        },
        {
          key: "NPC_INTERACTION",
          label: "NPCs",
          description: "Interacoes com mentor, mercador, curandeiro e explorador.",
        },
        {
          key: "MARKET",
          label: "Mercado",
          description: "Acao rapida para negociar ou procurar recursos antes da loja.",
        },
      ],
    };
  }

  static async listMonsters() {
    return prisma.monster.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
  }

  static async listActiveBounties() {
    return prisma.bountyHunt.findMany({
      where: {
        isActive: true,
        timeLimit: {
          gte: new Date(),
        },
      },
      include: {
        monster: true,
      },
      orderBy: [{ timeLimit: "asc" }, { reward: "desc" }],
    });
  }

  static async listActiveMissions() {
    return prisma.missionDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ recommendedLevel: "asc" }, { createdAt: "desc" }],
    });
  }

  static async listActiveTrainings() {
    return prisma.trainingDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ trainingType: "asc" }, { name: "asc" }],
    });
  }

  static async listActiveNpcs() {
    return prisma.npcDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ interactionType: "asc" }, { name: "asc" }],
    });
  }

  static async executeBountyHunt(userId: string, characterId: string, input: BountyHuntInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const bounty = await prisma.bountyHunt.findFirst({
      where: {
        id: input.bountyId,
        isActive: true,
      },
      include: {
        monster: true,
      },
    });

    if (!bounty) {
      throw new AppError(404, "Bounty nao encontrada.", "BOUNTY_NOT_FOUND");
    }

    if (bounty.timeLimit < new Date()) {
      throw new AppError(409, "Bounty expirada.", "BOUNTY_EXPIRED");
    }

    const reward: CombatReward = {
      xp: bounty.rewardXp > 0 ? bounty.rewardXp : bounty.monster.experience,
      coins: bounty.reward,
      item: bounty.rewardItemName
        ? {
            name: bounty.rewardItemName,
            value: bounty.rewardItemValue ?? 0,
            category: bounty.rewardItemCategory ?? "reward",
            type: bounty.rewardItemType ?? "generic",
            img: bounty.rewardItemImg ?? "/assets/items/default-reward.png",
            effect: bounty.rewardItemEffect ?? undefined,
            quantity: bounty.rewardItemQuantity,
          }
        : this.buildMonsterDrop(bounty.monster.name, bounty.monster.level),
    };

    const combat = this.resolveCombat(character, bounty.monster);
    return this.finishCombat(
      characterId,
      character,
      bounty.monster.name,
      "BOUNTY_HUNT",
      combat,
      reward
    );
  }

  static async executeMission(userId: string, characterId: string, input: MissionInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const mission = await prisma.missionDefinition.findFirst({
      where: {
        id: input.missionId,
        isActive: true,
      },
    });

    if (!mission) {
      throw new AppError(404, "Missao nao encontrada.", "MISSION_NOT_FOUND");
    }

    const monster = {
      name: mission.enemyName,
      level: mission.enemyLevel,
      health: mission.enemyHealth,
      attack: mission.enemyAttack,
      defense: mission.enemyDefense,
    };

    const reward: CombatReward = {
      xp: mission.rewardXp,
      coins: mission.rewardCoins,
      item: mission.rewardItemName
        ? {
            name: mission.rewardItemName,
            value: mission.rewardItemValue ?? 0,
            category: mission.rewardItemCategory ?? "quest",
            type: mission.rewardItemType ?? "mission_reward",
            img: mission.rewardItemImg ?? "/assets/items/mission-badge.png",
            effect: mission.rewardItemEffect ?? undefined,
            quantity: mission.rewardItemQuantity,
          }
        : undefined,
    };

    const combat = this.resolveCombat(character, monster);
    return this.finishCombat(characterId, character, mission.enemyName, "MISSION", combat, reward);
  }

  static async executeTraining(userId: string, characterId: string, input: TrainingInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const training = await prisma.trainingDefinition.findFirst({
      where: {
        id: input.trainingId,
        isActive: true,
      },
    });

    if (!training) {
      throw new AppError(404, "Treinamento nao encontrado.", "TRAINING_NOT_FOUND");
    }

    return prisma.$transaction(async (tx) => {
      const progression = await this.applyProgression(tx, characterId, character, training.xpReward);
      const updatedInventory = await tx.inventory.update({
        where: { id: character.inventory.id },
        data: {
          coins: {
            increment: training.coinsReward,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          characterId,
          type: "TRAINING_COMPLETED",
          value: training.xpReward,
        },
      });

      return {
        action: "TRAINING",
        trainingId: training.id,
        trainingType: training.trainingType,
        note: training.description,
        rewards: {
          xp: training.xpReward,
          coins: training.coinsReward,
        },
        progression,
        inventory: {
          id: updatedInventory.id,
          coins: updatedInventory.coins,
        },
        transaction,
      };
    });
  }

  static async executeNpcInteraction(
    userId: string,
    characterId: string,
    input: NpcInteractionInput
  ) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const npc = await prisma.npcDefinition.findFirst({
      where: {
        id: input.npcId,
        isActive: true,
      },
    });

    if (!npc) {
      throw new AppError(404, "NPC nao encontrado.", "NPC_NOT_FOUND");
    }

    return prisma.$transaction(async (tx) => {
      const xp = npc.xpReward;
      const coins = npc.coinsReward;
      const item: CombatReward["item"] = npc.rewardItemName
        ? {
            name: npc.rewardItemName,
            value: npc.rewardItemValue ?? 0,
            category: npc.rewardItemCategory ?? "npc_reward",
            type: npc.rewardItemType ?? "npc_item",
            img: npc.rewardItemImg ?? "/assets/items/npc-reward.png",
            effect: npc.rewardItemEffect ?? undefined,
            quantity: npc.rewardItemQuantity,
          }
        : undefined;
      const note = npc.dialogue ?? npc.description ?? "";

      const progression = xp > 0
        ? await this.applyProgression(tx, characterId, character, xp)
        : {
            previousXp: character.xp,
            currentXp: character.xp,
            previousLevel: character.level,
            currentLevel: character.level,
            levelUps: 0,
          };

      let inventoryCoins = character.inventory.coins;

      if (coins > 0) {
        const updatedInventory = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: {
            coins: {
              increment: coins,
            },
          },
        });
        inventoryCoins = updatedInventory.coins;
      }

      if (item) {
        await this.grantRewardItem(tx, character.inventory.id, item);
      }

      const transaction = await tx.transaction.create({
        data: {
          characterId,
          type: "NPC_INTERACTION_COMPLETED",
          value: xp > 0 ? xp : coins,
        },
      });

      return {
        action: "NPC_INTERACTION",
        npcId: npc.id,
        interactionType: npc.interactionType,
        npcName: npc.name,
        note,
        rewards: {
          xp,
          coins,
          item,
        },
        progression,
        inventory: {
          id: character.inventory.id,
          coins: inventoryCoins,
        },
        transaction,
      };
    });
  }

  static async executeMarketAction(userId: string, characterId: string, input: MarketActionInput) {
    const character = await this.getGameplayCharacter(userId, characterId);

    return prisma.$transaction(async (tx) => {
      let coinsDelta = 0;
      let item: CombatReward["item"];
      let note = "";

      if (input.action === "barter") {
        coinsDelta = 25 + character.level * 3;
        note = "Negociacao concluida com lucro no mercado.";
      } else {
        item = {
          name: "Bolsa de Recursos",
          value: 15,
          category: "resource",
          type: "coins",
          img: "/assets/items/resource-bag.png",
          effect: "Materiais comuns",
          quantity: 1,
        };
        note = "Busca no mercado rendeu um pacote de recursos.";
      }

      let inventoryCoins = character.inventory.coins;

      if (coinsDelta > 0) {
        const updatedInventory = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: {
            coins: {
              increment: coinsDelta,
            },
          },
        });
        inventoryCoins = updatedInventory.coins;
      }

      if (item) {
        await this.grantRewardItem(tx, character.inventory.id, item);
      }

      const transaction = await tx.transaction.create({
        data: {
          characterId,
          type: "MARKET_ACTION_COMPLETED",
          value: coinsDelta > 0 ? coinsDelta : item?.value ?? 0,
        },
      });

      return {
        action: "MARKET",
        marketAction: input.action,
        note,
        rewards: {
          coins: coinsDelta,
          item,
        },
        inventory: {
          id: character.inventory.id,
          coins: inventoryCoins,
        },
        transaction,
      };
    });
  }

  private static async finishCombat(
    characterId: string,
    character: GameplayCharacter,
    enemyName: string,
    actionType: "BOUNTY_HUNT" | "MISSION",
    combat: ReturnType<typeof GameplayService.resolveCombat>,
    reward: CombatReward
  ) {
    return prisma.$transaction(async (tx) => {
      const progression = combat.victory
        ? await this.applyProgression(tx, characterId, character, reward.xp)
        : {
            previousXp: character.xp,
            currentXp: character.xp,
            previousLevel: character.level,
            currentLevel: character.level,
            levelUps: 0,
          };

      let inventoryCoins = character.inventory.coins;

      if (combat.victory && reward.coins > 0) {
        const updatedInventory = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: {
            coins: {
              increment: reward.coins,
            },
          },
        });

        inventoryCoins = updatedInventory.coins;
      }

      if (combat.victory && reward.item) {
        await this.grantRewardItem(tx, character.inventory.id, reward.item);
      }

      const transaction = await tx.transaction.create({
        data: {
          characterId,
          type: `${actionType}_${combat.victory ? "WIN" : "LOSS"}`,
          value: combat.victory ? reward.xp + reward.coins : 0,
        },
      });

      return {
        action: actionType,
        enemy: enemyName,
        combat,
        rewards: combat.victory
          ? {
              xp: reward.xp,
              coins: reward.coins,
              item: reward.item,
            }
          : {
              xp: 0,
              coins: 0,
              item: null,
            },
        progression,
        inventory: {
          id: character.inventory.id,
          coins: inventoryCoins,
        },
        transaction,
      };
    });
  }

  private static resolveCombat(
    character: GameplayCharacter,
    monster: {
      name: string;
      level: number;
      health: number;
      attack: number;
      defense: number;
    }
  ) {
    const stats = this.deriveCharacterStats(character);
    let characterHealth = stats.maxHealth;
    let monsterHealth = monster.health;
    const rounds = [];
    const maxRounds = 6 + Math.max(0, character.level - monster.level) + 2;

    for (let index = 0; index < maxRounds; index += 1) {
      const critRoll = Math.random();
      const critBonus = critRoll <= stats.critChance ? 1.5 : 1;
      const characterDamage = Math.max(
        1,
        Math.round((stats.attack - monster.defense + 6 + Math.random() * 4) * critBonus)
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
        Math.round(monster.attack - stats.defense + 4 + Math.random() * 4)
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
  }

  private static deriveCharacterStats(
    character: GameplayCharacter
  ): DerivedStats {
    const baseStats: DerivedStats = {
      attack: 10 + character.level * 3,
      defense: 6 + character.level * 2,
      maxHealth: 70 + character.level * 18,
      critChance: 0.08,
    };

    const modifier = character.class.modifier.toUpperCase();

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

    for (const equipment of character.inventory.equipments.filter((entry) => entry.isEquipped)) {
      const effect = equipment.effect ?? "";
      const amount = this.extractEffectValue(effect);

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
  }

  private static extractEffectValue(effect: string) {
    const matched = effect.match(/(\d+)/);
    return matched ? Number(matched[1]) : 0;
  }

  private static buildMonsterDrop(monsterName: string, monsterLevel: number): CombatReward["item"] {
    return {
      name: `Trofeu de ${monsterName}`,
      value: 10 + monsterLevel * 3,
      category: "monster_drop",
      type: "coins",
      img: "/assets/items/monster-trophy.png",
      effect: `Drop de nivel ${monsterLevel}`,
      quantity: 1,
    };
  }

  private static async getGameplayCharacter(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        class: true,
        inventory: {
          include: {
            items: true,
            equipments: true,
          },
        },
      },
    });

    if (!character || !character.inventory) {
      throw new AppError(
        404,
        "Personagem ou inventario nao encontrado para gameplay.",
        "GAMEPLAY_CHARACTER_NOT_FOUND"
      );
    }

    return character as GameplayCharacter;
  }

  private static async applyProgression(
    tx: Prisma.TransactionClient,
    characterId: string,
    character: GameplayCharacter,
    xpGain: number
  ) {
    const previousXp = character.xp;
    const previousLevel = character.level;
    const currentXp = previousXp + xpGain;
    const currentLevel = Math.max(previousLevel, Math.floor(currentXp / 100) + 1);

    await tx.character.update({
      where: { id: characterId },
      data: {
        xp: currentXp,
        level: currentLevel,
      },
    });

    return {
      previousXp,
      currentXp,
      previousLevel,
      currentLevel,
      levelUps: currentLevel - previousLevel,
    };
  }

  private static async grantRewardItem(
    tx: Prisma.TransactionClient,
    inventoryId: string,
    item: NonNullable<CombatReward["item"]>
  ) {
    const existing = await tx.item.findFirst({
      where: {
        inventoryId,
        name: item.name,
        category: item.category,
        type: item.type,
        img: item.img,
        effect: item.effect ?? null,
        value: item.value,
      },
    });

    if (existing) {
      await tx.item.update({
        where: { id: existing.id },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
      return;
    }

    await tx.item.create({
      data: {
        inventoryId,
        name: item.name,
        value: item.value,
        category: item.category,
        type: item.type,
        img: item.img,
        effect: item.effect,
        quantity: item.quantity,
      },
    });
  }
}
