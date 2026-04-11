import { CharacterStatus, Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import {
  deriveCharacterState,
  deriveCharacterStats,
  getCooldownAvailability,
  getRepeatWindowAvailability,
  resolveCombat,
} from "./combat.engine";
import {
  BountyHuntInput,
  MarketActionInput,
  MissionInput,
  NpcInteractionInput,
  TrainingInput,
} from "./gameplay.types";

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

type ActionType = "BOUNTY_HUNT" | "MISSION" | "TRAINING" | "NPC_INTERACTION" | "MARKET";

const MARKET_ACTION_COOLDOWN_SECONDS = 300;
const NPC_INTERACTION_COOLDOWN_SECONDS = 900;
const MISSION_REPEAT_WINDOW_SECONDS = 1800;

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

    await this.assertCombatReady(character);
    await this.assertBountyNotAlreadyClaimed(characterId, bounty.id, bounty.timeLimit);

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

    const vitals = this.getCharacterVitals(character);
    const combat = resolveCombat(
      {
        level: character.level,
        currentHealth: vitals.currentHealth,
        maxHealth: vitals.maxHealth,
      },
      vitals.stats,
      bounty.monster
    );

    return this.finishCombat(
      characterId,
      character,
      bounty.monster.name,
      "BOUNTY_HUNT",
      bounty.id,
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

    await this.assertCombatReady(character);
    const missionAvailability = await this.assertActionWindowAvailable(
      characterId,
      "MISSION",
      mission.id,
      MISSION_REPEAT_WINDOW_SECONDS,
      "Missao indisponivel no momento. Aguarde para repetir."
    );

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

    const vitals = this.getCharacterVitals(character);
    const combat = resolveCombat(
      {
        level: character.level,
        currentHealth: vitals.currentHealth,
        maxHealth: vitals.maxHealth,
      },
      vitals.stats,
      monster
    );

    return this.finishCombat(
      characterId,
      character,
      mission.enemyName,
      "MISSION",
      mission.id,
      combat,
      reward,
      missionAvailability.nextAvailableAt ?? undefined
    );
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

    const availability = await this.assertActionWindowAvailable(
      characterId,
      "TRAINING",
      training.id,
      training.cooldownSeconds,
      "Treinamento em cooldown."
    );

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

      await this.recordActionLog(
        tx,
        characterId,
        "TRAINING",
        training.id,
        "COMPLETED",
        availability.nextAvailableAt ?? undefined
      );

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
        characterState: this.buildCharacterStatePayload(character, undefined, progression.currentLevel),
        availability: {
          actionType: "TRAINING",
          nextAvailableAt: availability.nextAvailableAt,
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

    const availability = await this.assertActionWindowAvailable(
      characterId,
      "NPC_INTERACTION",
      npc.id,
      NPC_INTERACTION_COOLDOWN_SECONDS,
      "NPC indisponivel no momento."
    );

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

      const healedState = npc.interactionType.toLowerCase() === "healer"
        ? await this.restoreCharacterHealth(tx, characterId, character, progression.currentLevel)
        : this.buildCharacterStatePayload(character, undefined, progression.currentLevel);

      await this.recordActionLog(
        tx,
        characterId,
        "NPC_INTERACTION",
        npc.id,
        npc.interactionType.toUpperCase(),
        availability.nextAvailableAt ?? undefined
      );

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
        characterState: healedState,
        availability: {
          actionType: "NPC_INTERACTION",
          nextAvailableAt: availability.nextAvailableAt,
        },
        transaction,
      };
    });
  }

  static async executeMarketAction(userId: string, characterId: string, input: MarketActionInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const availability = await this.assertActionWindowAvailable(
      characterId,
      "MARKET",
      input.action,
      MARKET_ACTION_COOLDOWN_SECONDS,
      "Acao de mercado em cooldown."
    );

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

      await this.recordActionLog(
        tx,
        characterId,
        "MARKET",
        input.action,
        "COMPLETED",
        availability.nextAvailableAt ?? undefined
      );

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
        characterState: this.buildCharacterStatePayload(character),
        availability: {
          actionType: "MARKET",
          nextAvailableAt: availability.nextAvailableAt,
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
    referenceId: string,
    combat: ReturnType<typeof resolveCombat>,
    reward: CombatReward,
    nextAvailableAt?: Date
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

      const characterState = await this.persistCombatState(
        tx,
        characterId,
        combat.characterHealthRemaining,
        progression.currentLevel,
        combat.victory
      );

      await this.recordActionLog(
        tx,
        characterId,
        actionType,
        referenceId,
        combat.victory ? "WIN" : "LOSS",
        nextAvailableAt
      );

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
        characterState,
        availability: {
          actionType,
          nextAvailableAt: nextAvailableAt ?? null,
        },
        transaction,
      };
    });
  }

  private static getCharacterVitals(character: GameplayCharacter) {
    const stats = deriveCharacterStats({
      level: character.level,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments
        .filter((entry) => entry.isEquipped)
        .map((entry) => entry.effect),
    });
    const state = deriveCharacterState({
      currentHealth: character.currentHealth,
      maxHealth: stats.maxHealth,
    });

    return {
      stats,
      currentHealth: state.currentHealth,
      maxHealth: stats.maxHealth,
      status: state.status,
    };
  }

  private static buildCharacterStatePayload(
    character: GameplayCharacter,
    currentHealth?: number,
    levelOverride?: number
  ) {
    const stats = deriveCharacterStats({
      level: levelOverride ?? character.level,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments
        .filter((entry) => entry.isEquipped)
        .map((entry) => entry.effect),
    });
    const state = deriveCharacterState({
      currentHealth: currentHealth ?? character.currentHealth,
      maxHealth: stats.maxHealth,
    });

    return {
      currentHealth: state.currentHealth,
      maxHealth: stats.maxHealth,
      status: state.status,
      lastCombatAt: character.lastCombatAt,
      lastRecoveredAt: character.lastRecoveredAt,
    };
  }

  private static async persistCombatState(
    tx: Prisma.TransactionClient,
    characterId: string,
    currentHealth: number,
    level: number,
    victory: boolean
  ) {
    const character = await tx.character.findUnique({
      where: { id: characterId },
      include: {
        class: true,
        inventory: {
          include: {
            equipments: true,
            items: true,
          },
        },
      },
    });

    if (!character || !character.inventory) {
      throw new AppError(404, "Personagem de combate nao encontrado.", "GAMEPLAY_CHARACTER_NOT_FOUND");
    }

    const payload = this.buildCharacterStatePayload(
      character as GameplayCharacter,
      currentHealth,
      level
    );

    const now = new Date();
    await tx.character.update({
      where: { id: characterId },
      data: {
        currentHealth: payload.currentHealth,
        status: payload.status as CharacterStatus,
        lastCombatAt: now,
        ...(victory && payload.status === "READY" ? { lastRecoveredAt: now } : {}),
      },
    });

    return {
      ...payload,
      lastCombatAt: now,
      lastRecoveredAt: victory && payload.status === "READY" ? now : character.lastRecoveredAt,
    };
  }

  private static async restoreCharacterHealth(
    tx: Prisma.TransactionClient,
    characterId: string,
    character: GameplayCharacter,
    levelOverride?: number
  ) {
    const stats = deriveCharacterStats({
      level: levelOverride ?? character.level,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments
        .filter((entry) => entry.isEquipped)
        .map((entry) => entry.effect),
    });
    const now = new Date();

    await tx.character.update({
      where: { id: characterId },
      data: {
        currentHealth: stats.maxHealth,
        status: CharacterStatus.READY,
        lastRecoveredAt: now,
      },
    });

    return {
      currentHealth: stats.maxHealth,
      maxHealth: stats.maxHealth,
      status: "READY",
      lastCombatAt: character.lastCombatAt,
      lastRecoveredAt: now,
    };
  }

  private static async assertCombatReady(character: GameplayCharacter) {
    const vitals = this.getCharacterVitals(character);

    if (vitals.currentHealth <= 0 || vitals.status === "DEFEATED") {
      throw new AppError(
        409,
        "Personagem derrotado. Procure um NPC curandeiro antes de voltar ao combate.",
        "CHARACTER_DEFEATED"
      );
    }
  }

  private static async assertBountyNotAlreadyClaimed(
    characterId: string,
    bountyId: string,
    activeUntil: Date
  ) {
    const completed = await prisma.characterActionLog.findFirst({
      where: {
        characterId,
        actionType: "BOUNTY_HUNT",
        referenceId: bountyId,
        outcome: "WIN",
      },
      orderBy: { createdAt: "desc" },
    });

    if (completed && completed.createdAt <= activeUntil) {
      throw new AppError(
        409,
        "Esta bounty ja foi concluida por este personagem enquanto ainda estava ativa.",
        "BOUNTY_ALREADY_COMPLETED",
        { nextAvailableAt: activeUntil }
      );
    }
  }

  private static async assertActionWindowAvailable(
    characterId: string,
    actionType: ActionType,
    referenceId: string,
    windowSeconds: number,
    message: string
  ) {
    const latest = await prisma.characterActionLog.findFirst({
      where: {
        characterId,
        actionType,
        referenceId,
      },
      orderBy: { createdAt: "desc" },
    });

    const availability = actionType === "MISSION"
      ? getRepeatWindowAvailability(latest?.createdAt, windowSeconds)
      : getCooldownAvailability(latest?.createdAt, windowSeconds);

    if (!availability.available) {
      throw new AppError(409, message, "ACTION_ON_COOLDOWN", {
        nextAvailableAt: availability.nextAvailableAt,
      });
    }

    return {
      nextAvailableAt:
        windowSeconds > 0 ? new Date(Date.now() + windowSeconds * 1000) : availability.nextAvailableAt,
    };
  }

  private static async recordActionLog(
    tx: Prisma.TransactionClient,
    characterId: string,
    actionType: ActionType,
    referenceId: string,
    outcome: string,
    availableAt?: Date
  ) {
    await tx.characterActionLog.create({
      data: {
        characterId,
        actionType,
        referenceId,
        outcome,
        availableAt,
      },
    });
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

    const vitals = this.getCharacterVitals(character as GameplayCharacter);

    if (
      character.currentHealth !== vitals.currentHealth ||
      character.status !== (vitals.status as CharacterStatus)
    ) {
      await prisma.character.update({
        where: { id: characterId },
        data: {
          currentHealth: vitals.currentHealth,
          status: vitals.status as CharacterStatus,
        },
      });
      character.currentHealth = vitals.currentHealth;
      character.status = vitals.status as CharacterStatus;
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
