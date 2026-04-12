import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { getLevelFromXp } from "../characters/character.progression";
import { CharacterService } from "../characters/character.service";

interface GrantItemInput {
  name: string;
  value: number;
  category: string;
  type: string;
  img: string;
  effect?: string | null;
  levelRequirement?: number | null;
  quantity?: number;
}

interface GrantEquipmentInput {
  name: string;
  value: number;
  category: string;
  type: string;
  img: string;
  effect?: string | null;
  levelRequirement?: number | null;
  quantity?: number;
}

export class InventoryService {
  static async getInventoryByCharacter(userId: string, characterId: string) {
    const character = await CharacterService.ensureOwnership(userId, characterId);

    if (!character.inventoryId) {
      const inventory = await prisma.inventory.create({
        data: {
          coins: 0,
          characterId,
        },
        include: {
          items: true,
          equipments: true,
        },
      });

      await prisma.character.update({
        where: { id: characterId },
        data: {
          inventoryId: inventory.id,
        },
      });

      return inventory;
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: character.inventoryId },
      include: {
        items: true,
        equipments: true,
      },
    });

    if (!inventory) {
      throw new AppError(404, "Inventario nao encontrado.", "INVENTORY_NOT_FOUND");
    }

    return inventory;
  }

  static async getWallet(userId: string, characterId: string) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    return {
      inventoryId: inventory.id,
      coins: inventory.coins,
    };
  }

  static async grantCoins(userId: string, characterId: string, coins: number) {
    if (coins <= 0) {
      throw new AppError(400, "A quantidade de coins deve ser positiva.", "INVALID_COINS_AMOUNT");
    }

    const inventory = await this.getInventoryByCharacter(userId, characterId);

    return prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        coins: {
          increment: coins,
        },
      },
    });
  }

  static async grantItemToCharacter(userId: string, characterId: string, item: GrantItemInput) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    return this.grantItemToInventory(inventory.id, item);
  }

  static async grantEquipmentToCharacter(
    userId: string,
    characterId: string,
    equipment: GrantEquipmentInput
  ) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    return this.grantEquipmentToInventory(inventory.id, equipment);
  }

  static async useItem(userId: string, characterId: string, itemId: string, note?: string) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    const item = inventory.items.find((entry) => entry.id === itemId);
    const character = await CharacterService.ensureOwnership(userId, characterId);

    if (!item) {
      throw new AppError(404, "Item nao encontrado no inventario.", "ITEM_NOT_FOUND");
    }

    this.ensureCharacterMeetsLevelRequirement(character.level, item.levelRequirement);

    const appliedEffects = this.resolveItemEffects(item.type, item.value);

    const result = await prisma.$transaction(async (tx) => {
      if (item.quantity <= 1) {
        await tx.item.delete({
          where: { id: item.id },
        });
      } else {
        await tx.item.update({
          where: { id: item.id },
          data: {
            quantity: {
              decrement: 1,
            },
          },
        });
      }

      if (appliedEffects.xp > 0 || appliedEffects.coins > 0) {
        const nextXp = character.xp + appliedEffects.xp;
        const nextLevel = Math.max(character.level, getLevelFromXp(nextXp));

        await tx.character.update({
          where: { id: characterId },
          data: {
            xp: nextXp,
            level: nextLevel,
          },
        });

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            coins: {
              increment: appliedEffects.coins,
            },
          },
        });
      }

      await tx.transaction.create({
        data: {
          characterId,
          type: "ITEM_USED",
          value: appliedEffects.coins > 0 ? appliedEffects.coins : appliedEffects.xp,
        },
      });

      return {
        itemId: item.id,
        itemName: item.name,
        consumed: 1,
        effect: item.effect,
        note: note ?? null,
        appliedEffects,
      };
    });

    return result;
  }

  static async equipEquipment(userId: string, characterId: string, equipmentId: string) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    const equipment = inventory.equipments.find((entry) => entry.id === equipmentId);
    const character = await CharacterService.ensureOwnership(userId, characterId);

    if (!equipment) {
      throw new AppError(404, "Equipamento nao encontrado no inventario.", "EQUIPMENT_NOT_FOUND");
    }

    this.ensureCharacterMeetsLevelRequirement(character.level, equipment.levelRequirement);

    return prisma.$transaction(async (tx) => {
      await tx.equipment.updateMany({
        where: {
          inventoryId: inventory.id,
          type: equipment.type,
          isEquipped: true,
          NOT: {
            id: equipment.id,
          },
        },
        data: {
          isEquipped: false,
          equippedAt: null,
        },
      });

      const updatedEquipment = await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          isEquipped: true,
          equippedAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          characterId,
          type: "EQUIPMENT_EQUIPPED",
          value: updatedEquipment.value,
        },
      });

      return updatedEquipment;
    });
  }

  static async unequipEquipment(userId: string, characterId: string, equipmentId: string) {
    const inventory = await this.getInventoryByCharacter(userId, characterId);
    const equipment = inventory.equipments.find((entry) => entry.id === equipmentId);

    if (!equipment) {
      throw new AppError(404, "Equipamento nao encontrado no inventario.", "EQUIPMENT_NOT_FOUND");
    }

    if (!equipment.isEquipped) {
      throw new AppError(409, "Equipamento ja esta desequipado.", "EQUIPMENT_NOT_EQUIPPED");
    }

    return prisma.$transaction(async (tx) => {
      const updatedEquipment = await tx.equipment.update({
        where: { id: equipment.id },
        data: {
          isEquipped: false,
          equippedAt: null,
        },
      });

      await tx.transaction.create({
        data: {
          characterId,
          type: "EQUIPMENT_UNEQUIPPED",
          value: updatedEquipment.value,
        },
      });

      return updatedEquipment;
    });
  }

  private static resolveItemEffects(type: string, value: number) {
    const normalizedType = type.toLowerCase();

    if (normalizedType === "xp_boost" || normalizedType === "xp") {
      return { xp: value, coins: 0 };
    }

    if (normalizedType === "coin_bag" || normalizedType === "coins") {
      return { xp: 0, coins: value };
    }

    return { xp: 0, coins: 0 };
  }

  private static ensureCharacterMeetsLevelRequirement(
    characterLevel: number,
    levelRequirement?: number | null
  ) {
    if (!levelRequirement || characterLevel >= levelRequirement) {
      return;
    }

    throw new AppError(
      409,
      `Nivel insuficiente. Requer level ${levelRequirement} e o personagem esta no level ${characterLevel}.`,
      "LEVEL_REQUIREMENT_NOT_MET"
    );
  }

  static async grantItemToInventory(inventoryId: string, item: GrantItemInput) {
    const quantity = item.quantity ?? 1;

    if (quantity <= 0) {
      throw new AppError(400, "A quantidade do item deve ser positiva.", "INVALID_ITEM_QUANTITY");
    }

    const existing = await prisma.item.findFirst({
      where: {
        inventoryId,
        name: item.name,
        category: item.category,
        type: item.type,
        img: item.img,
        effect: item.effect ?? null,
        levelRequirement: item.levelRequirement ?? null,
        value: item.value,
      },
    });

    if (existing) {
      return prisma.item.update({
        where: { id: existing.id },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });
    }

    return prisma.item.create({
      data: {
        inventoryId,
        name: item.name,
        value: item.value,
        category: item.category,
        type: item.type,
        img: item.img,
        effect: item.effect ?? null,
        levelRequirement: item.levelRequirement ?? null,
        quantity,
      },
    });
  }

  static async grantEquipmentToInventory(inventoryId: string, equipment: GrantEquipmentInput) {
    const quantity = equipment.quantity ?? 1;

    if (quantity <= 0) {
      throw new AppError(
        400,
        "A quantidade do equipamento deve ser positiva.",
        "INVALID_EQUIPMENT_QUANTITY"
      );
    }

    const createdEquipments = [];

    for (let index = 0; index < quantity; index += 1) {
      const createdEquipment = await prisma.equipment.create({
        data: {
          inventoryId,
          name: equipment.name,
          value: equipment.value,
          category: equipment.category,
          type: equipment.type,
          img: equipment.img,
          effect: equipment.effect ?? null,
          levelRequirement: equipment.levelRequirement ?? null,
        },
      });

      createdEquipments.push(createdEquipment);
    }

    return createdEquipments;
  }
}
