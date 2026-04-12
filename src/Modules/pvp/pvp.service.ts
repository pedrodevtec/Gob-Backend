import { CharacterStatus, Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { MAX_CHARACTER_LEVEL } from "../characters/character.progression";
import { CharacterService } from "../characters/character.service";
import { deriveCharacterState, deriveCharacterStats, presentDerivedStats, resolvePvpCombat } from "../gameplay/combat.engine";
import { CreatePvpMatchInput } from "./pvp.types";

const PVP_MIN_LEVEL = 45;
const PVP_COOLDOWN_SECONDS = 1800;
const PVP_BASE_RATING = 1000;
const PVP_RATING_WIN = 20;
const PVP_RATING_LOSS = 10;

type PvpCharacter = Prisma.CharacterGetPayload<{
  include: {
    class: true;
    inventory: {
      include: {
        equipments: true;
        items: true;
      };
    };
  };
}>;

export class PvpService {
  static async getOverview(userId: string, characterId: string) {
    const character = await this.getOwnedPvpCharacter(userId, characterId);
    const cooldown = this.getPvpCooldown(character.lastPvpAt);

    return {
      characterId: character.id,
      level: character.level,
      maxLevel: MAX_CHARACTER_LEVEL,
      pvpUnlocked: character.level >= PVP_MIN_LEVEL,
      requiredLevel: PVP_MIN_LEVEL,
      cooldownSeconds: PVP_COOLDOWN_SECONDS,
      availability: {
        available: cooldown.available,
        nextAvailableAt: cooldown.nextAvailableAt,
      },
      ranking: {
        rating: character.pvpRating,
        wins: character.pvpWins,
        losses: character.pvpLosses,
      },
    };
  }

  static async getRanking(limit = 50) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const characters = await prisma.character.findMany({
      where: {
        level: {
          gte: PVP_MIN_LEVEL,
        },
      },
      take: safeLimit,
      orderBy: [{ pvpRating: "desc" }, { pvpWins: "desc" }, { level: "desc" }, { createdAt: "asc" }],
      include: {
        class: true,
      },
    });

    return {
      requiredLevel: PVP_MIN_LEVEL,
      cooldownSeconds: PVP_COOLDOWN_SECONDS,
      entries: characters.map((entry, index) => ({
        position: index + 1,
        rating: entry.pvpRating,
        wins: entry.pvpWins,
        losses: entry.pvpLosses,
        character: {
          id: entry.id,
          name: entry.name,
          level: entry.level,
          status: entry.status,
          class: {
            id: entry.class.id,
            name: entry.class.name,
            tier: entry.class.tier,
            modifier: entry.class.modifier,
          },
        },
      })),
    };
  }

  static async createMatch(userId: string, input: CreatePvpMatchInput) {
    const challenger = await this.getOwnedPvpCharacter(userId, input.characterId);
    const opponent = await this.getAnyPvpCharacter(input.opponentCharacterId);

    if (challenger.id === opponent.id) {
      throw new AppError(409, "Nao e possivel desafiar o mesmo personagem.", "INVALID_PVP_TARGET");
    }

    if (challenger.userId === opponent.userId) {
      throw new AppError(409, "PvP deve ocorrer entre jogadores diferentes.", "INVALID_PVP_TARGET");
    }

    this.assertPvpEligibility(challenger);
    this.assertPvpEligibility(opponent);

    const challengerCooldown = this.getPvpCooldown(challenger.lastPvpAt);
    if (!challengerCooldown.available) {
      throw new AppError(409, "Seu personagem esta em cooldown de PvP.", "PVP_ON_COOLDOWN", {
        nextAvailableAt: challengerCooldown.nextAvailableAt,
      });
    }

    const opponentCooldown = this.getPvpCooldown(opponent.lastPvpAt);
    if (!opponentCooldown.available) {
      throw new AppError(409, "O oponente esta em cooldown de PvP.", "PVP_TARGET_ON_COOLDOWN", {
        nextAvailableAt: opponentCooldown.nextAvailableAt,
      });
    }

    const challengerStats = deriveCharacterStats({
      level: challenger.level,
      className: challenger.class.name,
      classModifier: challenger.class.modifier,
      equipmentEffects: challenger.inventory?.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect) ?? [],
    });
    const opponentStats = deriveCharacterStats({
      level: opponent.level,
      className: opponent.class.name,
      classModifier: opponent.class.modifier,
      equipmentEffects: opponent.inventory?.equipments.filter((entry) => entry.isEquipped).map((entry) => entry.effect) ?? [],
    });

    const combat = resolvePvpCombat(
      {
        level: challenger.level,
        currentHealth: challenger.currentHealth,
        maxHealth: challengerStats.maxHealth,
      },
      challengerStats,
      {
        level: opponent.level,
        currentHealth: opponent.currentHealth,
        maxHealth: opponentStats.maxHealth,
      },
      opponentStats
    );

    const winner = combat.winner === "challenger" ? challenger : opponent;
    const loser = combat.winner === "challenger" ? opponent : challenger;
    const challengerRatingBefore = challenger.pvpRating ?? PVP_BASE_RATING;
    const opponentRatingBefore = opponent.pvpRating ?? PVP_BASE_RATING;
    const challengerRatingAfter =
      combat.winner === "challenger"
        ? challengerRatingBefore + PVP_RATING_WIN
        : Math.max(PVP_BASE_RATING, challengerRatingBefore - PVP_RATING_LOSS);
    const opponentRatingAfter =
      combat.winner === "opponent"
        ? opponentRatingBefore + PVP_RATING_WIN
        : Math.max(PVP_BASE_RATING, opponentRatingBefore - PVP_RATING_LOSS);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const challengerState = this.buildPvpCharacterState(
        challenger,
        challengerStats.maxHealth,
        combat.challengerHealthRemaining
      );
      const opponentState = this.buildPvpCharacterState(
        opponent,
        opponentStats.maxHealth,
        combat.opponentHealthRemaining
      );

      await tx.character.update({
        where: { id: challenger.id },
        data: {
          currentHealth: challengerState.currentHealth,
          status: challengerState.status,
          pvpRating: challengerRatingAfter,
          pvpWins: combat.winner === "challenger" ? { increment: 1 } : undefined,
          pvpLosses: combat.winner === "opponent" ? { increment: 1 } : undefined,
          lastPvpAt: now,
          lastCombatAt: now,
        },
      });

      await tx.character.update({
        where: { id: opponent.id },
        data: {
          currentHealth: opponentState.currentHealth,
          status: opponentState.status,
          pvpRating: opponentRatingAfter,
          pvpWins: combat.winner === "opponent" ? { increment: 1 } : undefined,
          pvpLosses: combat.winner === "challenger" ? { increment: 1 } : undefined,
          lastPvpAt: now,
          lastCombatAt: now,
        },
      });

      const match = await tx.pvpMatch.create({
        data: {
          challengerCharacterId: challenger.id,
          opponentCharacterId: opponent.id,
          winnerCharacterId: winner.id,
          loserCharacterId: loser.id,
          challengerRatingBefore,
          challengerRatingAfter,
          opponentRatingBefore,
          opponentRatingAfter,
        },
      });

      await tx.characterActionLog.createMany({
        data: [
          {
            characterId: challenger.id,
            actionType: "PVP",
            referenceId: match.id,
            outcome: combat.winner === "challenger" ? "WIN" : "LOSS",
            availableAt: new Date(now.getTime() + PVP_COOLDOWN_SECONDS * 1000),
          },
          {
            characterId: opponent.id,
            actionType: "PVP",
            referenceId: match.id,
            outcome: combat.winner === "opponent" ? "WIN" : "LOSS",
            availableAt: new Date(now.getTime() + PVP_COOLDOWN_SECONDS * 1000),
          },
        ],
      });

      return {
        match: {
          id: match.id,
          createdAt: match.createdAt,
          cooldownEndsAt: new Date(now.getTime() + PVP_COOLDOWN_SECONDS * 1000),
          winnerCharacterId: winner.id,
          loserCharacterId: loser.id,
        },
        challenger: {
          id: challenger.id,
          name: challenger.name,
          ratingBefore: challengerRatingBefore,
          ratingAfter: challengerRatingAfter,
          state: challengerState,
          stats: presentDerivedStats(challengerStats),
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          ratingBefore: opponentRatingBefore,
          ratingAfter: opponentRatingAfter,
          state: opponentState,
          stats: presentDerivedStats(opponentStats),
        },
        combat: {
          ...combat,
          challengerStats: presentDerivedStats(combat.challengerStats),
          opponentStats: presentDerivedStats(combat.opponentStats),
        },
      };
    });
  }

  private static buildPvpCharacterState(character: PvpCharacter, maxHealth: number, currentHealth: number) {
    const state = deriveCharacterState({
      currentHealth,
      maxHealth,
    });

    return {
      currentHealth: state.currentHealth,
      maxHealth,
      status: state.status as CharacterStatus,
      lastCombatAt: character.lastCombatAt,
      lastRecoveredAt: character.lastRecoveredAt,
    };
  }

  private static assertPvpEligibility(character: PvpCharacter) {
    if (character.level < PVP_MIN_LEVEL) {
      throw new AppError(
        409,
        `PvP desbloqueia apenas no nivel ${PVP_MIN_LEVEL}.`,
        "PVP_LEVEL_REQUIRED"
      );
    }

    if (character.status === CharacterStatus.DEFEATED || character.currentHealth <= 0) {
      throw new AppError(
        409,
        "Personagem derrotado nao pode entrar em PvP.",
        "PVP_CHARACTER_DEFEATED"
      );
    }
  }

  private static getPvpCooldown(lastPvpAt?: Date | null) {
    if (!lastPvpAt) {
      return { available: true, nextAvailableAt: null as Date | null };
    }

    const nextAvailableAt = new Date(lastPvpAt.getTime() + PVP_COOLDOWN_SECONDS * 1000);
    return {
      available: nextAvailableAt <= new Date(),
      nextAvailableAt,
    };
  }

  private static async getOwnedPvpCharacter(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);
    return this.getAnyPvpCharacter(characterId);
  }

  private static async getAnyPvpCharacter(characterId: string) {
    const character = await prisma.character.findUnique({
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

    if (!character?.inventory) {
      throw new AppError(404, "Personagem nao encontrado para PvP.", "CHARACTER_NOT_FOUND");
    }

    return character;
  }
}
