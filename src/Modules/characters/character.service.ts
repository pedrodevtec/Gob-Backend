import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
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
    const classId = input.classId ?? (await this.getDefaultClassId());

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
          classId,
          inventoryId: inventory.id,
          level: 1,
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

  private static async getDefaultClassId(): Promise<string> {
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

    return firstClass.id;
  }
}
