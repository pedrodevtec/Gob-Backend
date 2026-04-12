import { Prisma, TradeAssetType, TradeParticipantSide, TradeStatus } from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import { CreateTradeRequestInput, RespondTradeRequestInput, TradeAssetInput } from "./trade.types";

const DEFAULT_TRADE_EXPIRATION_HOURS = 24;

export class TradeService {
  static async listTrades(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);
    await this.expirePendingTrades();

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { requesterCharacterId: characterId },
          { targetCharacterId: characterId },
        ],
      },
      include: {
        requesterCharacter: {
          select: { id: true, name: true, userId: true },
        },
        targetCharacter: {
          select: { id: true, name: true, userId: true },
        },
        assets: {
          orderBy: [{ side: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      characterId,
      incoming: trades.filter((entry) => entry.targetCharacterId === characterId),
      outgoing: trades.filter((entry) => entry.requesterCharacterId === characterId),
    };
  }

  static async createTradeRequest(userId: string, input: CreateTradeRequestInput) {
    const requesterCharacter = await this.getOwnedCharacterWithInventory(
      userId,
      input.requesterCharacterId
    );
    const targetCharacter = await this.getAnyCharacterWithInventory(input.targetCharacterId);

    if (requesterCharacter.id === targetCharacter.id) {
      throw new AppError(409, "Nao e possivel abrir troca com o mesmo personagem.", "INVALID_TRADE_TARGET");
    }

    if (requesterCharacter.userId === targetCharacter.userId) {
      throw new AppError(409, "Trocas devem ser feitas com outro jogador.", "INVALID_TRADE_TARGET");
    }

    this.validateTradeAssetsAgainstInventory(
      requesterCharacter.inventory.id,
      requesterCharacter.inventory.items,
      requesterCharacter.inventory.equipments,
      input.offeredAssets ?? [],
      "ofertado"
    );
    this.validateTradeAssetsAgainstInventory(
      targetCharacter.inventory.id,
      targetCharacter.inventory.items,
      targetCharacter.inventory.equipments,
      input.requestedAssets ?? [],
      "solicitado"
    );

    if ((input.offeredCoins ?? 0) > requesterCharacter.inventory.coins) {
      throw new AppError(409, "Gold ofertado maior que o saldo atual.", "INSUFFICIENT_COINS_FOR_TRADE");
    }

    if ((input.requestedCoins ?? 0) > targetCharacter.inventory.coins) {
      throw new AppError(409, "Gold solicitado maior que o saldo atual do alvo.", "INVALID_TRADE_REQUEST");
    }

    const expiresAt = new Date(
      Date.now() + (input.expiresInHours ?? DEFAULT_TRADE_EXPIRATION_HOURS) * 60 * 60 * 1000
    );

    return prisma.trade.create({
      data: {
        requesterCharacterId: requesterCharacter.id,
        targetCharacterId: targetCharacter.id,
        offeredCoins: input.offeredCoins ?? 0,
        requestedCoins: input.requestedCoins ?? 0,
        note: input.note ?? null,
        expiresAt,
        assets: {
          create: [
            ...(input.offeredAssets ?? []).map((asset) => ({
              side: TradeParticipantSide.REQUESTER,
              assetType: asset.assetType,
              assetId: asset.assetId,
              quantity: asset.assetType === "EQUIPMENT" ? 1 : asset.quantity ?? 1,
            })),
            ...(input.requestedAssets ?? []).map((asset) => ({
              side: TradeParticipantSide.TARGET,
              assetType: asset.assetType,
              assetId: asset.assetId,
              quantity: asset.assetType === "EQUIPMENT" ? 1 : asset.quantity ?? 1,
            })),
          ],
        },
      },
      include: {
        requesterCharacter: { select: { id: true, name: true } },
        targetCharacter: { select: { id: true, name: true } },
        assets: true,
      },
    });
  }

  static async respondTradeRequest(userId: string, tradeId: string, input: RespondTradeRequestInput) {
    await this.expirePendingTrades();

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        requesterCharacter: true,
        targetCharacter: true,
        assets: true,
      },
    });

    if (!trade) {
      throw new AppError(404, "Solicitacao de troca nao encontrada.", "TRADE_NOT_FOUND");
    }

    if (trade.status !== TradeStatus.PENDING) {
      throw new AppError(409, "Esta troca nao esta mais pendente.", "TRADE_ALREADY_RESOLVED");
    }

    if (trade.expiresAt <= new Date()) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.EXPIRED },
      });
      throw new AppError(409, "Esta troca expirou.", "TRADE_EXPIRED");
    }

    if (input.action === "CANCEL") {
      if (trade.requesterCharacter.userId !== userId) {
        throw new AppError(403, "Somente o solicitante pode cancelar a troca.", "TRADE_FORBIDDEN");
      }

      return prisma.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.CANCELED },
        include: {
          requesterCharacter: { select: { id: true, name: true } },
          targetCharacter: { select: { id: true, name: true } },
          assets: true,
        },
      });
    }

    if (trade.targetCharacter.userId !== userId) {
      throw new AppError(403, "Somente o destinatario pode responder a troca.", "TRADE_FORBIDDEN");
    }

    if (input.action === "REJECT") {
      return prisma.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.REJECTED },
        include: {
          requesterCharacter: { select: { id: true, name: true } },
          targetCharacter: { select: { id: true, name: true } },
          assets: true,
        },
      });
    }

    return prisma.$transaction(async (tx) => {
      const requesterCharacter = await tx.character.findUnique({
        where: { id: trade.requesterCharacterId },
        include: {
          inventory: {
            include: {
              items: true,
              equipments: true,
            },
          },
        },
      });
      const targetCharacter = await tx.character.findUnique({
        where: { id: trade.targetCharacterId },
        include: {
          inventory: {
            include: {
              items: true,
              equipments: true,
            },
          },
        },
      });

      if (!requesterCharacter?.inventory || !targetCharacter?.inventory) {
        throw new AppError(404, "Inventario nao encontrado para concluir a troca.", "INVENTORY_NOT_FOUND");
      }

      const requesterAssets = trade.assets.filter((entry) => entry.side === TradeParticipantSide.REQUESTER);
      const targetAssets = trade.assets.filter((entry) => entry.side === TradeParticipantSide.TARGET);

      this.validateTradeAssetsAgainstInventory(
        requesterCharacter.inventory.id,
        requesterCharacter.inventory.items,
        requesterCharacter.inventory.equipments,
        requesterAssets.map((entry) => ({
          assetType: entry.assetType,
          assetId: entry.assetId,
          quantity: entry.quantity,
        })),
        "ofertado"
      );
      this.validateTradeAssetsAgainstInventory(
        targetCharacter.inventory.id,
        targetCharacter.inventory.items,
        targetCharacter.inventory.equipments,
        targetAssets.map((entry) => ({
          assetType: entry.assetType,
          assetId: entry.assetId,
          quantity: entry.quantity,
        })),
        "solicitado"
      );

      if (trade.offeredCoins > requesterCharacter.inventory.coins) {
        throw new AppError(409, "O solicitante nao possui mais o gold ofertado.", "TRADE_ASSET_UNAVAILABLE");
      }

      if (trade.requestedCoins > targetCharacter.inventory.coins) {
        throw new AppError(409, "O destinatario nao possui mais o gold solicitado.", "TRADE_ASSET_UNAVAILABLE");
      }

      await this.transferTradeAssets(
        tx,
        requesterCharacter.inventory.id,
        targetCharacter.inventory.id,
        requesterAssets
      );
      await this.transferTradeAssets(
        tx,
        targetCharacter.inventory.id,
        requesterCharacter.inventory.id,
        targetAssets
      );

      if (trade.offeredCoins > 0) {
        await tx.inventory.update({
          where: { id: requesterCharacter.inventory.id },
          data: { coins: { decrement: trade.offeredCoins } },
        });
        await tx.inventory.update({
          where: { id: targetCharacter.inventory.id },
          data: { coins: { increment: trade.offeredCoins } },
        });
      }

      if (trade.requestedCoins > 0) {
        await tx.inventory.update({
          where: { id: targetCharacter.inventory.id },
          data: { coins: { decrement: trade.requestedCoins } },
        });
        await tx.inventory.update({
          where: { id: requesterCharacter.inventory.id },
          data: { coins: { increment: trade.requestedCoins } },
        });
      }

      await tx.transaction.createMany({
        data: [
          {
            characterId: requesterCharacter.id,
            type: "TRADE_ACCEPTED",
            value: trade.requestedCoins - trade.offeredCoins,
          },
          {
            characterId: targetCharacter.id,
            type: "TRADE_ACCEPTED",
            value: trade.offeredCoins - trade.requestedCoins,
          },
        ],
      });

      return tx.trade.update({
        where: { id: trade.id },
        data: { status: TradeStatus.ACCEPTED },
        include: {
          requesterCharacter: { select: { id: true, name: true } },
          targetCharacter: { select: { id: true, name: true } },
          assets: true,
        },
      });
    });
  }

  private static async expirePendingTrades() {
    await prisma.trade.updateMany({
      where: {
        status: TradeStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: TradeStatus.EXPIRED,
      },
    });
  }

  private static async transferTradeAssets(
    tx: Prisma.TransactionClient,
    fromInventoryId: string,
    toInventoryId: string,
    assets: Array<{
      assetType: TradeAssetType;
      assetId: string;
      quantity: number;
    }>
  ) {
    for (const asset of assets) {
      if (asset.assetType === TradeAssetType.ITEM) {
        const item = await tx.item.findFirst({
          where: {
            id: asset.assetId,
            inventoryId: fromInventoryId,
          },
        });

        if (!item || item.quantity < asset.quantity) {
          throw new AppError(409, "Item indisponivel para concluir a troca.", "TRADE_ASSET_UNAVAILABLE");
        }

        if (item.quantity === asset.quantity) {
          await tx.item.delete({
            where: { id: item.id },
          });
        } else {
          await tx.item.update({
            where: { id: item.id },
            data: {
              quantity: {
                decrement: asset.quantity,
              },
            },
          });
        }

        const existing = await tx.item.findFirst({
          where: {
            inventoryId: toInventoryId,
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
          await tx.item.update({
            where: { id: existing.id },
            data: {
              quantity: {
                increment: asset.quantity,
              },
            },
          });
        } else {
          await tx.item.create({
            data: {
              inventoryId: toInventoryId,
              name: item.name,
              value: item.value,
              category: item.category,
              type: item.type,
              img: item.img,
              effect: item.effect,
              levelRequirement: item.levelRequirement,
              quantity: asset.quantity,
            },
          });
        }

        continue;
      }

      const equipment = await tx.equipment.findFirst({
        where: {
          id: asset.assetId,
          inventoryId: fromInventoryId,
        },
      });

      if (!equipment) {
        throw new AppError(409, "Equipamento indisponivel para concluir a troca.", "TRADE_ASSET_UNAVAILABLE");
      }

      if (equipment.isEquipped) {
        throw new AppError(409, "Desequipe o equipamento antes de troca-lo.", "TRADE_EQUIPPED_ASSET");
      }

      await tx.equipment.delete({
        where: { id: equipment.id },
      });

      await tx.equipment.create({
        data: {
          inventoryId: toInventoryId,
          name: equipment.name,
          value: equipment.value,
          category: equipment.category,
          type: equipment.type,
          img: equipment.img,
          effect: equipment.effect,
          isEquipped: false,
          equippedAt: null,
        },
      });
    }
  }

  private static validateTradeAssetsAgainstInventory(
    inventoryId: string,
    items: Array<{
      id: string;
      inventoryId: string;
      quantity: number;
    }>,
    equipments: Array<{
      id: string;
      inventoryId: string;
      isEquipped: boolean;
    }>,
    assets: TradeAssetInput[],
    label: string
  ) {
    for (const asset of assets) {
      if (asset.assetType === "ITEM") {
        const item = items.find((entry) => entry.id === asset.assetId && entry.inventoryId === inventoryId);

        if (!item) {
          throw new AppError(404, `Item ${label} nao encontrado no inventario.`, "TRADE_ASSET_NOT_FOUND");
        }

        if ((asset.quantity ?? 1) > item.quantity) {
          throw new AppError(409, `Quantidade do item ${label} excede o saldo.`, "TRADE_INVALID_QUANTITY");
        }

        continue;
      }

      const equipment = equipments.find(
        (entry) => entry.id === asset.assetId && entry.inventoryId === inventoryId
      );

      if (!equipment) {
        throw new AppError(404, `Equipamento ${label} nao encontrado no inventario.`, "TRADE_ASSET_NOT_FOUND");
      }

      if (equipment.isEquipped) {
        throw new AppError(409, `Equipamento ${label} precisa estar desequipado.`, "TRADE_EQUIPPED_ASSET");
      }
    }
  }

  private static async getOwnedCharacterWithInventory(userId: string, characterId: string) {
    await CharacterService.ensureOwnership(userId, characterId);

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: {
          include: {
            items: true,
            equipments: true,
          },
        },
      },
    });

    if (!character?.inventory) {
      throw new AppError(404, "Inventario nao encontrado para trade.", "INVENTORY_NOT_FOUND");
    }

    return character as typeof character & {
      inventory: NonNullable<typeof character.inventory>;
    };
  }

  private static async getAnyCharacterWithInventory(characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: {
          include: {
            items: true,
            equipments: true,
          },
        },
      },
    });

    if (!character || !character.inventory) {
      throw new AppError(404, "Personagem alvo ou inventario nao encontrado.", "CHARACTER_NOT_FOUND");
    }

    return character as typeof character & {
      inventory: NonNullable<typeof character.inventory>;
    };
  }
}
