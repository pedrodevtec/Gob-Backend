import {
  CharacterStatus,
  CombatSessionStatus,
  CombatSourceType,
  GameplayDifficulty,
  MissionSessionStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { getLevelFromXp } from "../characters/character.progression";
import { CharacterService } from "../characters/character.service";
import {
  calculateCharacterTurnDamage,
  calculateMonsterTurnDamage,
  deriveCharacterState,
  deriveCharacterStats,
  getCooldownAvailability,
  presentDerivedStats,
} from "./combat.engine";
import { getMissionNodeById, normalizeMissionJourney } from "./mission.journey";
import {
  BountyHuntInput,
  CombatTurnInput,
  MarketActionInput,
  MissionInput,
  MissionJourneyDefinition,
  NpcInteractionInput,
  ProgressMissionJourneyInput,
  StartMissionJourneyInput,
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

interface MissionDefeatPenalty {
  xpLoss: number;
  coinsLoss: number;
  forceDefeat: boolean;
}

type GameplayCharacter = Prisma.CharacterGetPayload<{
  include: {
    class: true;
    inventory: { include: { items: true; equipments: true } };
  };
}> & {
  inventory: NonNullable<
    Prisma.CharacterGetPayload<{
      include: { inventory: { include: { items: true; equipments: true } } };
    }>["inventory"]
  >;
};

const MARKET_ACTION_COOLDOWN_SECONDS = 300;
const NPC_INTERACTION_COOLDOWN_SECONDS = 900;
const NPC_BUFF_DURATION_SECONDS = 3600;
const NPC_BUFF_COSTS: Record<2 | 4 | 6, number> = { 2: 200, 4: 400, 6: 600 };
const MISSION_DEFEAT_RULES: Record<
  GameplayDifficulty,
  { xpLossPercent: number; coinsLossPercent: number; forceDefeat: boolean }
> = {
  EASY: { xpLossPercent: 0, coinsLossPercent: 0, forceDefeat: false },
  MEDIUM: { xpLossPercent: 0.05, coinsLossPercent: 0.08, forceDefeat: false },
  HARD: { xpLossPercent: 0.12, coinsLossPercent: 0.18, forceDefeat: false },
  ELITE: { xpLossPercent: 0.2, coinsLossPercent: 0.25, forceDefeat: true },
};

export class GameplayService {
  static async getJourneyOptions() {
    return {
      onboarding: ["REGISTER", "LOGIN", "CREATE_CHARACTER", "CHOOSE_CLASS"],
      activities: [
        { key: "BOUNTY_HUNT", label: "Bounty Hunt", description: "Combate manual por turnos." },
        { key: "MISSION", label: "Missoes Dinamicas", description: "Fluxo iniciado por NPC." },
        { key: "TRAINING", label: "Treinamentos", description: "Progressao com cooldown." },
        { key: "NPC_INTERACTION", label: "NPCs", description: "Dialogo, cura, buffs e gatilhos." },
        { key: "MARKET", label: "Mercado", description: "Busca e troca rapida de recursos." },
      ],
      combatActions: ["ATTACK", "DEFEND", "POWER_ATTACK"],
    };
  }

  static async listMonsters() {
    return prisma.monster.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] });
  }

  static async listActiveBounties() {
    return prisma.bountyHunt.findMany({
      where: { isActive: true, timeLimit: { gte: new Date() } },
      include: { monster: true },
      orderBy: [{ timeLimit: "asc" }, { reward: "desc" }],
    });
  }

  static async listActiveMissions() {
    const missions = await prisma.missionDefinition.findMany({
      where: { isActive: true },
      include: { startNpc: true, completionNpc: true },
      orderBy: [{ recommendedLevel: "asc" }, { createdAt: "desc" }],
    });

    return missions.map((mission) => ({
      ...mission,
      journeySummary: this.buildJourneySummary(normalizeMissionJourney(mission)),
      defeatPenalty: this.describeMissionDefeatPenalty(mission.difficulty),
    }));
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
      include: {
        startingMissions: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            recommendedLevel: true,
            imageUrl: true,
          },
          orderBy: [{ recommendedLevel: "asc" }, { createdAt: "desc" }],
        },
      },
      orderBy: [{ interactionType: "asc" }, { name: "asc" }],
    });
  }

  static async listMissionSessions(userId: string, characterId: string) {
    await this.getGameplayCharacter(userId, characterId);
    const sessions = await prisma.characterMissionSession.findMany({
      where: {
        characterId,
        status: { in: [MissionSessionStatus.IN_PROGRESS, MissionSessionStatus.READY_TO_TURN_IN] },
      },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
      orderBy: [{ updatedAt: "desc" }],
    });

    return Promise.all(sessions.map((session) => this.buildMissionSessionPayload(session)));
  }

  static async getMissionSession(userId: string, characterId: string, sessionId: string) {
    await this.getGameplayCharacter(userId, characterId);
    const session = await prisma.characterMissionSession.findFirst({
      where: { id: sessionId, characterId },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    if (!session) {
      throw new AppError(404, "Sessao de missao nao encontrada.", "MISSION_SESSION_NOT_FOUND");
    }

    return this.buildMissionSessionPayload(session);
  }

  static async startMissionJourney(userId: string, characterId: string, input: StartMissionJourneyInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const mission = await prisma.missionDefinition.findFirst({
      where: { id: input.missionId, isActive: true },
      include: { startNpc: true, completionNpc: true },
    });

    if (!mission) {
      throw new AppError(404, "Missao nao encontrada.", "MISSION_NOT_FOUND");
    }

    if (!mission.startNpcId || mission.startNpcId !== input.npcId) {
      throw new AppError(409, "Esta missao precisa ser iniciada pelo NPC configurado.", "MISSION_WRONG_START_NPC");
    }

    await this.assertNoActiveCombatSession(characterId);

    const existing = await prisma.characterMissionSession.findFirst({
      where: {
        characterId,
        missionId: mission.id,
        status: { in: [MissionSessionStatus.IN_PROGRESS, MissionSessionStatus.READY_TO_TURN_IN] },
      },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    if (existing) {
      return this.buildMissionSessionPayload(existing);
    }

    const availability = await this.assertActionWindowAvailable(
      characterId,
      "MISSION",
      mission.id,
      mission.repeatCooldownSeconds,
      "Missao indisponivel no momento. Aguarde para repetir."
    );

    const journey = normalizeMissionJourney(mission);
    const session = await prisma.characterMissionSession.create({
      data: {
        characterId,
        missionId: mission.id,
        currentNodeId: journey.startNodeId,
        metadata: {
          startedByNpcId: input.npcId,
          choices: [],
          completedCombatNodeIds: [],
          nextAvailableAt: availability.nextAvailableAt?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
      },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    return this.resolveMissionNode(character, session);
  }

  static async progressMissionJourney(
    userId: string,
    characterId: string,
    sessionId: string,
    input: ProgressMissionJourneyInput
  ) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const session = await prisma.characterMissionSession.findFirst({
      where: { id: sessionId, characterId },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    if (!session) {
      throw new AppError(404, "Sessao de missao nao encontrada.", "MISSION_SESSION_NOT_FOUND");
    }

    const journey = normalizeMissionJourney(session.mission);
    const node = getMissionNodeById(journey, session.currentNodeId);

    if (node.type === "COMBAT") {
      const combat = await prisma.combatSession.findFirst({
        where: { missionSessionId: session.id, status: CombatSessionStatus.IN_PROGRESS },
      });

      if (!combat) {
        throw new AppError(409, "Este passo exige um combate ativo.", "MISSION_COMBAT_REQUIRED");
      }

      return this.buildMissionSessionPayload(session, combat);
    }

    if (node.type === "CHOICE") {
      const choice = node.choices?.find((entry) => entry.id === input.choiceId);

      if (!choice) {
        throw new AppError(400, "choiceId invalido para este passo.", "MISSION_CHOICE_REQUIRED");
      }

      const updated = await prisma.characterMissionSession.update({
        where: { id: session.id },
        data: {
          currentNodeId: choice.nextNodeId,
          selectedPath: choice.id,
          metadata: this.extendMissionSessionMetadata(session.metadata, {
            choices: [...this.getMissionSessionMetadataArray(session.metadata, "choices"), choice.id],
          }),
        },
        include: { mission: { include: { startNpc: true, completionNpc: true } } },
      });

      return this.resolveMissionNode(character, updated);
    }

    if (node.type === "RETURN_TO_NPC") {
      const expectedNpcId = node.npcId ?? session.mission.completionNpcId;

      if (!input.npcId || input.npcId !== expectedNpcId) {
        throw new AppError(409, "Voce precisa retornar ao NPC correto.", "MISSION_RETURN_NPC_REQUIRED");
      }

      const updated = await prisma.characterMissionSession.update({
        where: { id: session.id },
        data: {
          currentNodeId: node.nextNodeId ?? "complete",
          status: MissionSessionStatus.READY_TO_TURN_IN,
        },
        include: { mission: { include: { startNpc: true, completionNpc: true } } },
      });

      return this.resolveMissionNode(character, updated);
    }

    if (node.type === "COMPLETE") {
      return this.completeMissionJourney(character, session);
    }

    if (!node.nextNodeId) {
      throw new AppError(409, "Este passo nao possui proxima etapa.", "MISSION_NODE_HAS_NO_NEXT");
    }

    const updated = await prisma.characterMissionSession.update({
      where: { id: session.id },
      data: { currentNodeId: node.nextNodeId },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    return this.resolveMissionNode(character, updated);
  }

  static async executeBountyHunt(userId: string, characterId: string, input: BountyHuntInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const activeBuff = await this.getActiveNpcBuff(characterId);
    const bounty = await prisma.bountyHunt.findFirst({
      where: { id: input.bountyId, isActive: true },
      include: { monster: true },
    });

    if (!bounty) {
      throw new AppError(404, "Bounty nao encontrada.", "BOUNTY_NOT_FOUND");
    }

    if (bounty.timeLimit < new Date()) {
      throw new AppError(409, "Bounty expirada.", "BOUNTY_EXPIRED");
    }

    await this.assertCombatReady(character, activeBuff?.buffPercent);
    await this.assertNoActiveCombatSession(characterId);
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

    const combatSession = await this.createCombatSession(character, {
      sourceType: CombatSourceType.BOUNTY_HUNT,
      sourceId: bounty.id,
      enemy: {
        name: bounty.monster.name,
        imageUrl: bounty.monster.imageUrl ?? undefined,
        level: bounty.monster.level,
        health: bounty.monster.health,
        attack: bounty.monster.attack,
        defense: bounty.monster.defense,
      },
      reward,
      nextAvailableAt: bounty.timeLimit,
      buffPercent: activeBuff?.buffPercent,
    });

    return { action: "BOUNTY_HUNT", mode: "MANUAL", enemy: bounty.monster.name, combatSession };
  }

  static async executeMission(userId: string, characterId: string, input: MissionInput) {
    const mission = await prisma.missionDefinition.findFirst({
      where: { id: input.missionId, isActive: true },
      include: { startNpc: true, completionNpc: true },
    });

    if (!mission) {
      throw new AppError(404, "Missao nao encontrada.", "MISSION_NOT_FOUND");
    }

    if (mission.startNpcId) {
      throw new AppError(409, "Esta missao precisa ser iniciada por NPC.", "MISSION_REQUIRES_NPC_START");
    }

    const existing = await prisma.characterMissionSession.findFirst({
      where: {
        characterId,
        missionId: mission.id,
        status: { in: [MissionSessionStatus.IN_PROGRESS, MissionSessionStatus.READY_TO_TURN_IN] },
      },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    if (existing) {
      const character = await this.getGameplayCharacter(userId, characterId);
      return this.resolveMissionNode(character, existing);
    }

    return this.startMissionJourneyWithoutNpc(userId, characterId, mission);
  }

  static async executeTraining(userId: string, characterId: string, input: TrainingInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const training = await prisma.trainingDefinition.findFirst({
      where: { id: input.trainingId, isActive: true },
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
      const inventory = await tx.inventory.update({
        where: { id: character.inventory.id },
        data: { coins: { increment: training.coinsReward } },
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
        data: { characterId, type: "TRAINING_COMPLETED", value: training.xpReward },
      });

      return {
        action: "TRAINING",
        trainingId: training.id,
        trainingType: training.trainingType,
        note: training.description,
        rewards: { xp: training.xpReward, coins: training.coinsReward },
        progression,
        inventory: { id: inventory.id, coins: inventory.coins },
        characterState: this.buildCharacterStatePayload(character, undefined, progression.currentLevel),
        availability: { actionType: "TRAINING", nextAvailableAt: availability.nextAvailableAt },
        transaction,
      };
    });
  }

  static async executeNpcInteraction(userId: string, characterId: string, input: NpcInteractionInput) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const npc = await prisma.npcDefinition.findFirst({
      where: { id: input.npcId, isActive: true },
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
      if (npc.interactionType.toLowerCase() === "buffer") {
        return this.applyNpcBuff(tx, character, npc, input.buffPercent, availability.nextAvailableAt ?? undefined);
      }

      const progression = npc.xpReward > 0
        ? await this.applyProgression(tx, characterId, character, npc.xpReward)
        : {
            previousXp: character.xp,
            currentXp: character.xp,
            previousLevel: character.level,
            currentLevel: character.level,
            levelUps: 0,
          };

      let coins = character.inventory.coins;
      if (npc.coinsReward > 0) {
        const updated = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: { coins: { increment: npc.coinsReward } },
        });
        coins = updated.coins;
      }

      if (npc.rewardItemName) {
        await this.grantRewardItem(tx, character.inventory.id, {
          name: npc.rewardItemName,
          value: npc.rewardItemValue ?? 0,
          category: npc.rewardItemCategory ?? "npc_reward",
          type: npc.rewardItemType ?? "npc_item",
          img: npc.rewardItemImg ?? "/assets/items/npc-reward.png",
          effect: npc.rewardItemEffect ?? undefined,
          quantity: npc.rewardItemQuantity,
        });
      }

      const characterState =
        npc.interactionType.toLowerCase() === "healer"
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
          value: npc.xpReward > 0 ? npc.xpReward : npc.coinsReward,
        },
      });

      return {
        action: "NPC_INTERACTION",
        npcId: npc.id,
        npcName: npc.name,
        interactionType: npc.interactionType,
        note: npc.dialogue ?? npc.description,
        rewards: {
          xp: npc.xpReward,
          coins: npc.coinsReward,
          item: npc.rewardItemName
            ? { name: npc.rewardItemName, quantity: npc.rewardItemQuantity, img: npc.rewardItemImg }
            : null,
        },
        progression,
        inventory: { id: character.inventory.id, coins },
        characterState,
        availability: { actionType: "NPC_INTERACTION", nextAvailableAt: availability.nextAvailableAt },
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

      let coins = character.inventory.coins;
      if (coinsDelta > 0) {
        const updated = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: { coins: { increment: coinsDelta } },
        });
        coins = updated.coins;
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
        rewards: { coins: coinsDelta, item },
        inventory: { id: character.inventory.id, coins },
        characterState: this.buildCharacterStatePayload(character),
        availability: { actionType: "MARKET", nextAvailableAt: availability.nextAvailableAt },
        transaction,
      };
    });
  }

  static async executeCombatTurn(
    userId: string,
    characterId: string,
    combatSessionId: string,
    input: CombatTurnInput
  ) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const combat = await prisma.combatSession.findFirst({
      where: { id: combatSessionId, characterId },
      include: { missionSession: { include: { mission: { include: { startNpc: true, completionNpc: true } } } } },
    });

    if (!combat) {
      throw new AppError(404, "Sessao de combate nao encontrada.", "COMBAT_SESSION_NOT_FOUND");
    }

    if (combat.status !== CombatSessionStatus.IN_PROGRESS) {
      throw new AppError(409, "Esta sessao ja foi encerrada.", "COMBAT_SESSION_CLOSED");
    }

    const buffPercent = this.getCombatSessionBuffPercent(combat.metadata);
    const stats = deriveCharacterStats({
      level: character.level,
      className: character.class.name,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect),
      buffPercent,
    });

    const playerTurn = calculateCharacterTurnDamage(stats, combat.enemyDefense, input.action);
    const battleLog = this.getCombatBattleLog(combat.battleLog);
    const nextEnemyHealth = Math.max(0, combat.enemyCurrentHealth - playerTurn.damage);

    battleLog.push({
      round: combat.turnNumber,
      actor: "character",
      action: input.action,
      damage: playerTurn.damage,
      critical: playerTurn.critical,
      remainingEnemyHealth: nextEnemyHealth,
    });

    let nextCharacterHealth = combat.characterCurrentHealth;
    if (nextEnemyHealth > 0) {
      const enemyDamage = calculateMonsterTurnDamage(combat.enemyAttack, stats, input.action);
      nextCharacterHealth = Math.max(0, nextCharacterHealth - enemyDamage);
      battleLog.push({
        round: combat.turnNumber,
        actor: "monster",
        action: "ATTACK",
        damage: enemyDamage,
        critical: false,
        remainingCharacterHealth: nextCharacterHealth,
      });
    }

    const victory = nextEnemyHealth <= 0 && nextCharacterHealth > 0;
    const defeat = nextCharacterHealth <= 0;

    if (!victory && !defeat) {
      const updated = await prisma.combatSession.update({
        where: { id: combat.id },
        data: {
          enemyCurrentHealth: nextEnemyHealth,
          characterCurrentHealth: nextCharacterHealth,
          turnNumber: { increment: 1 },
          battleLog,
        },
      });

      return { action: "COMBAT_TURN", outcome: "IN_PROGRESS", combatSession: this.serializeCombatSession(updated, stats) };
    }

    return this.finishCombatTurn(character, combat, {
      victory,
      enemyHealth: nextEnemyHealth,
      characterHealth: nextCharacterHealth,
      battleLog,
      stats,
    });
  }

  private static async startMissionJourneyWithoutNpc(userId: string, characterId: string, mission: any) {
    const character = await this.getGameplayCharacter(userId, characterId);
    const availability = await this.assertActionWindowAvailable(
      characterId,
      "MISSION",
      mission.id,
      mission.repeatCooldownSeconds,
      "Missao indisponivel no momento. Aguarde para repetir."
    );
    const journey = normalizeMissionJourney(mission);
    const session = await prisma.characterMissionSession.create({
      data: {
        characterId,
        missionId: mission.id,
        currentNodeId: journey.startNodeId,
        metadata: {
          startedByNpcId: null,
          choices: [],
          completedCombatNodeIds: [],
          nextAvailableAt: availability.nextAvailableAt?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
      },
      include: { mission: { include: { startNpc: true, completionNpc: true } } },
    });

    return this.resolveMissionNode(character, session);
  }

  private static async resolveMissionNode(character: GameplayCharacter, session: any) {
    const journey = normalizeMissionJourney(session.mission);
    const node = getMissionNodeById(journey, session.currentNodeId);

    if (node.type === "COMBAT") {
      const existingCombat = await prisma.combatSession.findFirst({
        where: { missionSessionId: session.id, status: CombatSessionStatus.IN_PROGRESS },
      });

      if (existingCombat) {
        return this.buildMissionSessionPayload(session, existingCombat);
      }

      const activeBuff = await this.getActiveNpcBuff(session.characterId);
      await this.assertCombatReady(character, activeBuff?.buffPercent);
      await this.assertNoActiveCombatSession(session.characterId);

      if (!node.enemy) {
        throw new AppError(500, "No de combate sem inimigo.", "MISSION_ENEMY_NOT_FOUND");
      }

      const combatSession = await this.createCombatSession(character, {
        sourceType: CombatSourceType.MISSION,
        sourceId: session.missionId,
        missionSessionId: session.id,
        enemy: node.enemy,
        reward: { xp: 0, coins: 0 },
        missionDifficulty: session.mission.difficulty,
        missionNodeId: node.id,
        nextAvailableAt: this.getMissionSessionNextAvailableAt(session.metadata),
        buffPercent: activeBuff?.buffPercent,
      });

      return this.buildMissionSessionPayload(session, combatSession.raw ?? combatSession);
    }

    if (node.type === "COMPLETE") {
      return this.completeMissionJourney(character, session);
    }

    return this.buildMissionSessionPayload(session);
  }

  private static async completeMissionJourney(character: GameplayCharacter, session: any) {
    if (session.status === MissionSessionStatus.COMPLETED) {
      return this.buildMissionSessionPayload(session);
    }

    return prisma.$transaction(async (tx) => {
      const reward: CombatReward = {
        xp: session.mission.rewardXp,
        coins: session.mission.rewardCoins,
        item: session.mission.rewardItemName
          ? {
              name: session.mission.rewardItemName,
              value: session.mission.rewardItemValue ?? 0,
              category: session.mission.rewardItemCategory ?? "quest",
              type: session.mission.rewardItemType ?? "mission_reward",
              img: session.mission.rewardItemImg ?? "/assets/items/mission-badge.png",
              effect: session.mission.rewardItemEffect ?? undefined,
              quantity: session.mission.rewardItemQuantity,
            }
          : undefined,
      };

      const progression = reward.xp > 0
        ? await this.applyProgression(tx, session.characterId, character, reward.xp)
        : {
            previousXp: character.xp,
            currentXp: character.xp,
            previousLevel: character.level,
            currentLevel: character.level,
            levelUps: 0,
          };

      let coins = character.inventory.coins;
      if (reward.coins > 0) {
        const inventory = await tx.inventory.update({
          where: { id: character.inventory.id },
          data: { coins: { increment: reward.coins } },
        });
        coins = inventory.coins;
      }

      if (reward.item) {
        await this.grantRewardItem(tx, character.inventory.id, reward.item);
      }

      const completed = await tx.characterMissionSession.update({
        where: { id: session.id },
        data: { status: MissionSessionStatus.COMPLETED, completedAt: new Date() },
        include: { mission: { include: { startNpc: true, completionNpc: true } } },
      });

      await this.recordActionLog(
        tx,
        session.characterId,
        "MISSION",
        session.missionId,
        "WIN",
        this.getMissionSessionNextAvailableAt(session.metadata) ?? undefined
      );

      const transaction = await tx.transaction.create({
        data: { characterId: session.characterId, type: "MISSION_COMPLETED", value: reward.xp + reward.coins },
      });

      return {
        ...(await this.buildMissionSessionPayload(completed)),
        completion: { rewards: reward, progression, inventory: { id: character.inventory.id, coins }, transaction },
      };
    });
  }

  private static async finishCombatTurn(character: GameplayCharacter, combat: any, input: any) {
    return prisma.$transaction(async (tx) => {
      let progression = {
        previousXp: character.xp,
        currentXp: character.xp,
        previousLevel: character.level,
        currentLevel: character.level,
        levelUps: 0,
      };
      let inventoryCoins = character.inventory.coins;
      let defeatPenalty: MissionDefeatPenalty | null = null;
      const reward = this.parseCombatReward(combat.rewards);

      if (combat.sourceType === CombatSourceType.BOUNTY_HUNT) {
        if (input.victory) {
          progression = await this.applyProgression(tx, character.id, character, reward.xp);
          if (reward.coins > 0) {
            const inventory = await tx.inventory.update({
              where: { id: character.inventory.id },
              data: { coins: { increment: reward.coins } },
            });
            inventoryCoins = inventory.coins;
          }
          if (reward.item) {
            await this.grantRewardItem(tx, character.inventory.id, reward.item);
          }
        }

        await this.recordActionLog(
          tx,
          character.id,
          "BOUNTY_HUNT",
          combat.sourceId,
          input.victory ? "WIN" : "LOSS",
          combat.availableAt ?? undefined
        );
      }

      if (combat.sourceType === CombatSourceType.MISSION) {
        if (!input.victory) {
          defeatPenalty = await this.applyMissionDefeatPenalty(tx, character.id, character, combat.missionSession.mission.difficulty);
          inventoryCoins = character.inventory.coins - defeatPenalty.coinsLoss;
          await this.recordActionLog(
            tx,
            character.id,
            "MISSION",
            combat.missionSession.missionId,
            "LOSS",
            combat.availableAt ?? undefined
          );
        } else {
          const journey = normalizeMissionJourney(combat.missionSession.mission);
          const nodeId = this.getCombatSessionMissionNodeId(combat.metadata);
          const currentNode = getMissionNodeById(journey, nodeId ?? combat.missionSession.currentNodeId);
          const nextNodeId = currentNode.nextNodeId ?? "complete";
          const nextNode = getMissionNodeById(journey, nextNodeId);
          await tx.characterMissionSession.update({
            where: { id: combat.missionSession.id },
            data: {
              currentNodeId: nextNodeId,
              status: nextNode.type === "RETURN_TO_NPC" ? MissionSessionStatus.READY_TO_TURN_IN : MissionSessionStatus.IN_PROGRESS,
              metadata: this.extendMissionSessionMetadata(combat.missionSession.metadata, {
                completedCombatNodeIds: [...this.getMissionSessionMetadataArray(combat.missionSession.metadata, "completedCombatNodeIds"), currentNode.id],
              }),
            },
          });
        }
      }

      const characterState = await this.persistCombatState(
        tx,
        character.id,
        defeatPenalty?.forceDefeat ? 0 : input.characterHealth,
        progression.currentLevel,
        input.victory,
        this.getCombatSessionBuffPercent(combat.metadata)
      );

      const finished = await tx.combatSession.update({
        where: { id: combat.id },
        data: {
          status: input.victory ? CombatSessionStatus.VICTORY : CombatSessionStatus.DEFEAT,
          enemyCurrentHealth: input.enemyHealth,
          characterCurrentHealth: input.characterHealth,
          battleLog: input.battleLog,
          completedAt: new Date(),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          characterId: character.id,
          type:
            combat.sourceType === CombatSourceType.BOUNTY_HUNT
              ? `BOUNTY_HUNT_${input.victory ? "WIN" : "LOSS"}`
              : `MISSION_${input.victory ? "STEP_WIN" : "LOSS"}`,
          value:
            combat.sourceType === CombatSourceType.BOUNTY_HUNT && input.victory
              ? reward.xp + reward.coins
              : -((defeatPenalty?.xpLoss ?? 0) + (defeatPenalty?.coinsLoss ?? 0)),
        },
      });

      const result: Record<string, unknown> = {
        action: "COMBAT_TURN",
        outcome: input.victory ? "VICTORY" : "DEFEAT",
        combatSession: this.serializeCombatSession(finished, input.stats),
        characterState,
        transaction,
      };

      if (combat.sourceType === CombatSourceType.BOUNTY_HUNT) {
        result.rewards = input.victory ? reward : { xp: 0, coins: 0, item: null };
        result.progression = progression;
        result.inventory = { id: character.inventory.id, coins: inventoryCoins };
      }

      if (combat.sourceType === CombatSourceType.MISSION) {
        const session = await tx.characterMissionSession.findUnique({
          where: { id: combat.missionSession.id },
          include: { mission: { include: { startNpc: true, completionNpc: true } } },
        });
        if (!session) {
          throw new AppError(404, "Sessao de missao nao encontrada.", "MISSION_SESSION_NOT_FOUND");
        }
        result.mission = input.victory ? await this.resolveMissionNode(character, session) : await this.buildMissionSessionPayload(session);
        if (defeatPenalty) {
          result.defeatPenalty = defeatPenalty;
        }
      }

      return result;
    });
  }

  private static async createCombatSession(character: GameplayCharacter, input: any) {
    const vitals = this.getCharacterVitals(character, input.buffPercent);
    const combat = await prisma.combatSession.create({
      data: {
        characterId: character.id,
        missionSessionId: input.missionSessionId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        enemyName: input.enemy.name,
        enemyImageUrl: input.enemy.imageUrl,
        enemyLevel: input.enemy.level,
        enemyAttack: input.enemy.attack,
        enemyDefense: input.enemy.defense,
        enemyCurrentHealth: input.enemy.health,
        enemyMaxHealth: input.enemy.health,
        characterCurrentHealth: vitals.currentHealth,
        characterMaxHealth: vitals.maxHealth,
        availableAt: input.nextAvailableAt,
        rewards: input.reward,
        defeatPenalty: input.missionDifficulty ? this.describeMissionDefeatPenalty(input.missionDifficulty) : Prisma.JsonNull,
        battleLog: [],
        metadata: { buffPercent: input.buffPercent ?? 0, missionNodeId: input.missionNodeId ?? null } as Prisma.InputJsonValue,
      },
    });

    return { ...this.serializeCombatSession(combat, vitals.stats), raw: combat };
  }

  private static async buildMissionSessionPayload(session: any, combat?: any) {
    const journey = normalizeMissionJourney(session.mission);
    const node = getMissionNodeById(journey, session.currentNodeId);
    const activeCombat =
      combat ??
      (node.type === "COMBAT"
        ? await prisma.combatSession.findFirst({ where: { missionSessionId: session.id, status: CombatSessionStatus.IN_PROGRESS } })
        : null);

    return {
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      nextAvailableAt: this.getMissionSessionNextAvailableAt(session.metadata),
      mission: {
        id: session.mission.id,
        title: session.mission.title,
        description: session.mission.description,
        difficulty: session.mission.difficulty,
        recommendedLevel: session.mission.recommendedLevel,
        imageUrl: session.mission.imageUrl,
        startNpc: session.mission.startNpc ? { id: session.mission.startNpc.id, name: session.mission.startNpc.name, imageUrl: session.mission.startNpc.imageUrl } : null,
        completionNpc: session.mission.completionNpc ? { id: session.mission.completionNpc.id, name: session.mission.completionNpc.name, imageUrl: session.mission.completionNpc.imageUrl } : null,
      },
      currentNode: { ...node, choices: node.choices ?? [] },
      journeySummary: this.buildJourneySummary(journey),
      combatSession: activeCombat ? this.serializeCombatSession(activeCombat, deriveCharacterStats({ level: 1, classModifier: "STR" })) : null,
    };
  }

  private static serializeCombatSession(combat: any, stats: ReturnType<typeof deriveCharacterStats>) {
    return {
      id: combat.id,
      missionSessionId: combat.missionSessionId ?? null,
      sourceType: combat.sourceType,
      sourceId: combat.sourceId,
      status: combat.status,
      turnNumber: combat.turnNumber,
      availableAt: combat.availableAt ?? null,
      enemy: {
        name: combat.enemyName,
        imageUrl: combat.enemyImageUrl ?? null,
        level: combat.enemyLevel,
        attack: combat.enemyAttack,
        defense: combat.enemyDefense,
        currentHealth: combat.enemyCurrentHealth,
        maxHealth: combat.enemyMaxHealth,
      },
      character: {
        currentHealth: combat.characterCurrentHealth,
        maxHealth: combat.characterMaxHealth,
        stats: presentDerivedStats(stats),
      },
      actions: ["ATTACK", "DEFEND", "POWER_ATTACK"],
      battleLog: this.getCombatBattleLog(combat.battleLog),
    };
  }

  private static buildJourneySummary(journey: MissionJourneyDefinition) {
    return journey.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title ?? null,
      text: node.text ?? null,
      nextNodeId: node.nextNodeId ?? null,
      choices: node.choices?.map((choice) => ({ id: choice.id, label: choice.label, nextNodeId: choice.nextNodeId })) ?? [],
    }));
  }

  private static describeMissionDefeatPenalty(difficulty: GameplayDifficulty) {
    const rules = MISSION_DEFEAT_RULES[difficulty];
    return {
      difficulty,
      xpLossPercent: Math.round(rules.xpLossPercent * 100),
      coinsLossPercent: Math.round(rules.coinsLossPercent * 100),
      forceDefeat: rules.forceDefeat,
    };
  }

  private static async applyMissionDefeatPenalty(tx: Prisma.TransactionClient, characterId: string, character: GameplayCharacter, difficulty: GameplayDifficulty) {
    const rules = MISSION_DEFEAT_RULES[difficulty];
    const xpLoss = Math.min(character.xp, Math.floor(character.xp * rules.xpLossPercent));
    const coinsLoss = Math.min(character.inventory.coins, Math.floor(character.inventory.coins * rules.coinsLossPercent));
    const nextXp = Math.max(0, character.xp - xpLoss);
    const nextLevel = Math.max(1, getLevelFromXp(nextXp));

    if (xpLoss > 0) {
      await tx.character.update({ where: { id: characterId }, data: { xp: nextXp, level: nextLevel } });
    }
    if (coinsLoss > 0) {
      await tx.inventory.update({ where: { id: character.inventory.id }, data: { coins: { decrement: coinsLoss } } });
    }

    return { xpLoss, coinsLoss, forceDefeat: rules.forceDefeat };
  }

  private static getCharacterVitals(character: GameplayCharacter, buffPercent?: number) {
    const stats = deriveCharacterStats({
      level: character.level,
      className: character.class.name,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect),
      buffPercent,
    });
    const state = deriveCharacterState({ currentHealth: character.currentHealth, maxHealth: stats.maxHealth });
    return { stats, currentHealth: state.currentHealth, maxHealth: stats.maxHealth, status: state.status };
  }

  private static buildCharacterStatePayload(character: GameplayCharacter, currentHealth?: number, levelOverride?: number, buffPercent?: number) {
    const stats = deriveCharacterStats({
      level: levelOverride ?? character.level,
      className: character.class.name,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect),
      buffPercent,
    });
    const state = deriveCharacterState({ currentHealth: currentHealth ?? character.currentHealth, maxHealth: stats.maxHealth });
    return { currentHealth: state.currentHealth, maxHealth: stats.maxHealth, status: state.status, lastCombatAt: character.lastCombatAt, lastRecoveredAt: character.lastRecoveredAt };
  }

  private static async persistCombatState(tx: Prisma.TransactionClient, characterId: string, currentHealth: number, level: number, victory: boolean, buffPercent?: number) {
    const character = await tx.character.findUnique({
      where: { id: characterId },
      include: { class: true, inventory: { include: { equipments: true, items: true } } },
    });
    if (!character || !character.inventory) {
      throw new AppError(404, "Personagem de combate nao encontrado.", "GAMEPLAY_CHARACTER_NOT_FOUND");
    }
    const payload = this.buildCharacterStatePayload(character as GameplayCharacter, currentHealth, level, buffPercent);
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
    return { ...payload, lastCombatAt: now, lastRecoveredAt: victory && payload.status === "READY" ? now : character.lastRecoveredAt };
  }

  private static async restoreCharacterHealth(tx: Prisma.TransactionClient, characterId: string, character: GameplayCharacter, levelOverride?: number) {
    const stats = deriveCharacterStats({
      level: levelOverride ?? character.level,
      className: character.class.name,
      classModifier: character.class.modifier,
      equipmentEffects: character.inventory.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect),
    });
    const now = new Date();
    await tx.character.update({
      where: { id: characterId },
      data: { currentHealth: stats.maxHealth, status: CharacterStatus.READY, lastRecoveredAt: now },
    });
    return { currentHealth: stats.maxHealth, maxHealth: stats.maxHealth, status: "READY", lastCombatAt: character.lastCombatAt, lastRecoveredAt: now };
  }

  private static async assertCombatReady(character: GameplayCharacter, buffPercent?: number) {
    const vitals = this.getCharacterVitals(character, buffPercent);
    if (vitals.currentHealth <= 0 || vitals.status === "DEFEATED") {
      throw new AppError(409, "Personagem derrotado. Procure um NPC curandeiro.", "CHARACTER_DEFEATED");
    }
  }

  private static async assertNoActiveCombatSession(characterId: string) {
    const active = await prisma.combatSession.findFirst({
      where: { characterId, status: CombatSessionStatus.IN_PROGRESS },
    });
    if (active) {
      throw new AppError(409, "Ja existe uma sessao de combate em andamento.", "COMBAT_SESSION_ALREADY_ACTIVE", { combatSessionId: active.id });
    }
  }

  private static async assertBountyNotAlreadyClaimed(characterId: string, bountyId: string, activeUntil: Date) {
    const completed = await prisma.characterActionLog.findFirst({
      where: { characterId, actionType: "BOUNTY_HUNT", referenceId: bountyId, outcome: "WIN" },
      orderBy: { createdAt: "desc" },
    });
    if (completed && completed.createdAt <= activeUntil) {
      throw new AppError(409, "Esta bounty ja foi concluida por este personagem.", "BOUNTY_ALREADY_COMPLETED", { nextAvailableAt: activeUntil });
    }
  }

  private static async assertActionWindowAvailable(characterId: string, actionType: any, referenceId: string, windowSeconds: number, message: string) {
    const latest = await prisma.characterActionLog.findFirst({
      where: { characterId, actionType, referenceId },
      orderBy: { createdAt: "desc" },
    });
    const availability = getCooldownAvailability(latest?.createdAt, windowSeconds);
    if (!availability.available) {
      throw new AppError(409, message, "ACTION_ON_COOLDOWN", { nextAvailableAt: availability.nextAvailableAt });
    }
    return { nextAvailableAt: windowSeconds > 0 ? new Date(Date.now() + windowSeconds * 1000) : availability.nextAvailableAt };
  }

  private static async recordActionLog(tx: Prisma.TransactionClient, characterId: string, actionType: any, referenceId: string, outcome: string, availableAt?: Date, metadata?: string) {
    await tx.characterActionLog.create({ data: { characterId, actionType, referenceId, outcome, availableAt, ...(metadata !== undefined ? { metadata } : {}) } });
  }

  private static async getActiveNpcBuff(characterId: string) {
    const logs = await prisma.characterActionLog.findMany({
      where: { characterId, actionType: "NPC_INTERACTION", outcome: "BUFF_APPLIED" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    for (const log of logs) {
      if (!log.metadata) {
        continue;
      }
      try {
        const parsed = JSON.parse(log.metadata);
        const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
        if (parsed.buffPercent && expiresAt && expiresAt > new Date()) {
          return { buffPercent: parsed.buffPercent, expiresAt, cost: parsed.cost ?? 0, npcName: parsed.npcName ?? null };
        }
      } catch {}
    }
    return null;
  }

  private static async applyNpcBuff(tx: Prisma.TransactionClient, character: GameplayCharacter, npc: any, requestedBuffPercent: 2 | 4 | 6 | undefined, nextAvailableAt?: Date) {
    if (!requestedBuffPercent) {
      throw new AppError(400, "NPC buffer exige buffPercent 2, 4 ou 6.", "BUFF_PERCENT_REQUIRED");
    }
    if (await this.getActiveNpcBuff(character.id)) {
      throw new AppError(409, "Ja existe um buff ativo neste personagem.", "BUFF_ALREADY_ACTIVE");
    }
    const cost = NPC_BUFF_COSTS[requestedBuffPercent];
    if (character.inventory.coins < cost) {
      throw new AppError(409, "Gold insuficiente para aplicar o buff.", "INSUFFICIENT_COINS");
    }
    const inventory = await tx.inventory.update({ where: { id: character.inventory.id }, data: { coins: { decrement: cost } } });
    const expiresAt = new Date(Date.now() + NPC_BUFF_DURATION_SECONDS * 1000);
    await this.recordActionLog(tx, character.id, "NPC_INTERACTION", npc.id, "BUFF_APPLIED", nextAvailableAt, JSON.stringify({ npcName: npc.name, buffPercent: requestedBuffPercent, cost, expiresAt: expiresAt.toISOString() }));
    const transaction = await tx.transaction.create({ data: { characterId: character.id, type: "NPC_BUFF_PURCHASE", value: -cost } });
    return {
      action: "NPC_INTERACTION",
      npcId: npc.id,
      interactionType: npc.interactionType,
      npcName: npc.name,
      note: npc.dialogue ?? npc.description ?? `Buff de ${requestedBuffPercent}% aplicado.`,
      rewards: { xp: 0, coins: -cost, item: null },
      buff: { percent: requestedBuffPercent, cost, expiresAt },
      inventory: { id: inventory.id, coins: inventory.coins },
      characterState: this.buildCharacterStatePayload(character, undefined, undefined, requestedBuffPercent),
      availability: { actionType: "NPC_INTERACTION", nextAvailableAt: nextAvailableAt ?? null },
      transaction,
    };
  }

  private static buildMonsterDrop(monsterName: string, monsterLevel: number): CombatReward["item"] {
    return { name: `Trofeu de ${monsterName}`, value: 10 + monsterLevel * 3, category: "monster_drop", type: "coins", img: "/assets/items/monster-trophy.png", effect: `Drop de nivel ${monsterLevel}`, quantity: 1 };
  }

  private static async getGameplayCharacter(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: { class: true, inventory: { include: { items: true, equipments: true } } },
    });
    if (!character || !character.inventory) {
      throw new AppError(404, "Personagem ou inventario nao encontrado.", "GAMEPLAY_CHARACTER_NOT_FOUND");
    }
    const vitals = this.getCharacterVitals(character as GameplayCharacter);
    if (character.currentHealth !== vitals.currentHealth || character.status !== (vitals.status as CharacterStatus)) {
      await prisma.character.update({ where: { id: characterId }, data: { currentHealth: vitals.currentHealth, status: vitals.status as CharacterStatus } });
      character.currentHealth = vitals.currentHealth;
      character.status = vitals.status as CharacterStatus;
    }
    return character as GameplayCharacter;
  }

  private static async applyProgression(tx: Prisma.TransactionClient, characterId: string, character: GameplayCharacter, xpGain: number) {
    const previousXp = character.xp;
    const previousLevel = character.level;
    const currentXp = previousXp + xpGain;
    const currentLevel = Math.max(previousLevel, getLevelFromXp(currentXp));
    await tx.character.update({ where: { id: characterId }, data: { xp: currentXp, level: currentLevel } });
    return { previousXp, currentXp, previousLevel, currentLevel, levelUps: currentLevel - previousLevel };
  }

  private static async grantRewardItem(tx: Prisma.TransactionClient, inventoryId: string, item: NonNullable<CombatReward["item"]>) {
    const existing = await tx.item.findFirst({
      where: { inventoryId, name: item.name, category: item.category, type: item.type, img: item.img, effect: item.effect ?? null, value: item.value },
    });
    if (existing) {
      await tx.item.update({ where: { id: existing.id }, data: { quantity: { increment: item.quantity } } });
      return;
    }
    await tx.item.create({ data: { inventoryId, name: item.name, value: item.value, category: item.category, type: item.type, img: item.img, effect: item.effect, quantity: item.quantity } });
  }

  private static parseCombatReward(value: Prisma.JsonValue | null): CombatReward {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { xp: 0, coins: 0 };
    }
    const reward = value as Record<string, unknown>;
    return {
      xp: typeof reward.xp === "number" ? reward.xp : 0,
      coins: typeof reward.coins === "number" ? reward.coins : 0,
      item: reward.item && typeof reward.item === "object" && !Array.isArray(reward.item)
        ? {
            name: String((reward.item as any).name ?? "Recompensa"),
            value: Number((reward.item as any).value ?? 0),
            category: String((reward.item as any).category ?? "reward"),
            type: String((reward.item as any).type ?? "generic"),
            img: String((reward.item as any).img ?? "/assets/items/default-reward.png"),
            effect: typeof (reward.item as any).effect === "string" ? (reward.item as any).effect : undefined,
            quantity: Number((reward.item as any).quantity ?? 1),
          }
        : undefined,
    };
  }

  private static getCombatBattleLog(value: Prisma.JsonValue | null) {
    return Array.isArray(value) ? ([...value] as Prisma.JsonArray) : ([] as Prisma.JsonArray);
  }

  private static extendMissionSessionMetadata(value: Prisma.JsonValue | null, patch: Record<string, unknown>): Prisma.InputJsonValue {
    const base = value && typeof value === "object" && !Array.isArray(value) ? (value as Prisma.JsonObject) : ({} as Prisma.JsonObject);
    return { ...base, ...patch } as Prisma.InputJsonObject;
  }

  private static getMissionSessionMetadataArray(value: Prisma.JsonValue | null, key: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [] as Prisma.JsonArray;
    }
    const entry = (value as Record<string, unknown>)[key];
    return Array.isArray(entry) ? ([...entry] as Prisma.JsonArray) : ([] as Prisma.JsonArray);
  }

  private static getMissionSessionNextAvailableAt(value: Prisma.JsonValue | null) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).nextAvailableAt : null;
    if (typeof raw !== "string") {
      return null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private static getCombatSessionBuffPercent(value: Prisma.JsonValue | null) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).buffPercent : null;
    return typeof raw === "number" && raw > 0 ? raw : undefined;
  }

  private static getCombatSessionMissionNodeId(value: Prisma.JsonValue | null) {
    const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).missionNodeId : null;
    return typeof raw === "string" ? raw : null;
  }
}
