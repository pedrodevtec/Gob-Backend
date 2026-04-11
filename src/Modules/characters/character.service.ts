import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { deriveCharacterStats } from "../gameplay/combat.engine";
import {
  CreateCharacterInput,
  UpdateCharacterPositionInput,
  UpdateCharacterProfileInput,
  UpdateCharacterProgressInput,
} from "./character.types";

export class CharacterService {
  static async listClasses() {
    return prisma.class.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async createCharacter(userId: string, input: CreateCharacterInput) {
    const characterClass = await this.getClassForCreation(input.classId);
    const startingStats = deriveCharacterStats({
      level: 1,
      classModifier: characterClass.modifier,
    });

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.create({
        data: {
          coins: 0,
        },
      });

      const character = await tx.character.create({
        data: {
          userId,
          name: input.name,
          classId: characterClass.id,
          inventoryId: inventory.id,
          level: 1,
          currentHealth: startingStats.maxHealth,
          status: "READY",
        },
        include: {
          class: true,
        },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          characterId: character.id,
        },
      });

      return character;
    });
  }

  static async getCharactersByUser(userId: string) {
    return prisma.character.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        class: true,
      },
    });
  }

  static async getCharacterById(userId: string, characterId: string) {
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
      include: {
        class: true,
        inventory: {
          include: {
            items: true,
            equipments: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        actionLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "CHARACTER_NOT_FOUND");
    }

    return character;
  }

  static async updateCharacterProfile(
    userId: string,
    characterId: string,
    data: UpdateCharacterProfileInput
  ) {
    await this.ensureOwnership(userId, characterId);

    return prisma.character.update({
      where: { id: characterId },
      data,
      include: {
        class: true,
      },
    });
  }

  static async updateCharacterProgress(
    userId: string,
    characterId: string,
    data: UpdateCharacterProgressInput
  ) {
    await this.ensureOwnership(userId, characterId);

    return prisma.character.update({
      where: { id: characterId },
      data,
    });
  }

  static async updateCharacterPosition(
    userId: string,
    characterId: string,
    data: UpdateCharacterPositionInput
  ) {
    await this.ensureOwnership(userId, characterId);

    return prisma.character.update({
      where: { id: characterId },
      data,
    });
  }

  static async deleteCharacter(userId: string, characterId: string) {
    const character = await this.ensureOwnership(userId, characterId);

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { characterId },
      });

      await tx.characterActionLog.deleteMany({
        where: { characterId },
      });

      if (character.inventoryId) {
        await tx.item.deleteMany({
          where: { inventoryId: character.inventoryId },
        });

        await tx.equipment.deleteMany({
          where: { inventoryId: character.inventoryId },
        });

        await tx.character.update({
          where: { id: characterId },
          data: { inventoryId: null },
        });

        await tx.inventory.delete({
          where: { id: character.inventoryId },
        });
      }

      await tx.character.delete({
        where: { id: characterId },
      });
    });

    return { message: "Personagem excluido com sucesso." };
  }

  static async getCharacterSummary(userId: string, characterId: string) {
    const character = await this.getCharacterById(userId, characterId);

    return {
      id: character.id,
      name: character.name,
      level: character.level,
      xp: character.xp,
      currentHealth: character.currentHealth,
      status: character.status,
      class: character.class,
      position: {
        posX: character.posX,
        posY: character.posY,
        posZ: character.posZ,
        lastCheckpoint: character.lastCheckpoint,
      },
      inventory: {
        id: character.inventory?.id ?? null,
        coins: character.inventory?.coins ?? 0,
        totalItems: character.inventory?.items.length ?? 0,
        totalEquipments: character.inventory?.equipments.length ?? 0,
      },
      recentTransactions: character.transactions,
      recentGameplayActions: character.actionLogs,
    };
  }

  static async ensureOwnership(userId: string, characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "CHARACTER_NOT_FOUND");
    }

    if (character.userId !== userId) {
      throw new AppError(403, "Acesso negado ao personagem.", "CHARACTER_FORBIDDEN");
    }

    return character;
  }

  private static async getClassForCreation(classId?: string) {
    if (classId) {
      const existingClass = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!existingClass) {
        throw new AppError(404, "Classe informada nao encontrada.", "CLASS_NOT_FOUND");
      }

      return existingClass;
    }

    const firstClass = await prisma.class.findFirst({
      orderBy: { name: "asc" },
    });

    if (!firstClass) {
      throw new AppError(
        400,
        "Nenhuma classe cadastrada. Cadastre classes antes de criar personagens.",
        "CLASS_REQUIRED"
      );
    }

    return firstClass;
  }
}
