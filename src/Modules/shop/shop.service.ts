import { PaymentOrderStatus, Prisma, ShopProduct, ShopProductAssetKind } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { InventoryService } from "../inventory/inventory.service";
import { CharacterService } from "../characters/character.service";
import {
  CreatePaymentOrderInput,
  MarketSaleInput,
  PaymentWebhookInput,
  PurchaseInput,
} from "./shop.types";

const MARKET_BUYABLE_ASSET_KINDS: ShopProductAssetKind[] = [
  ShopProductAssetKind.ITEM,
  ShopProductAssetKind.EQUIPMENT,
];
const ITEM_SELL_RATE = 0.6;
const EQUIPMENT_SELL_RATE = 0.7;

export const resolveMarketSellPrice = (
  value: number,
  assetType: "ITEM" | "EQUIPMENT" | ShopProductAssetKind
) => {
  const normalizedAssetType = String(assetType).toUpperCase() === "ITEM" ? "ITEM" : "EQUIPMENT";
  const multiplier = normalizedAssetType === "ITEM" ? ITEM_SELL_RATE : EQUIPMENT_SELL_RATE;

  return Math.max(1, Math.floor(value * multiplier));
};

export class ShopService {
  static async getCatalog() {
    return prisma.shopProduct.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  static async getMarketOverview(userId: string, characterId: string) {
    const inventory = await InventoryService.getInventoryByCharacter(userId, characterId);
    const buyCatalog = await prisma.shopProduct.findMany({
      where: {
        isActive: true,
        assetKind: {
          in: MARKET_BUYABLE_ASSET_KINDS,
        },
      },
      orderBy: [{ category: "asc" }, { price: "asc" }, { name: "asc" }],
    });

    return {
      characterId,
      wallet: {
        inventoryId: inventory.id,
        coins: inventory.coins,
      },
      buyCatalog: buyCatalog.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        type: product.type,
        img: product.img,
        effect: product.effect,
        levelRequirement: product.levelRequirement,
        assetKind: product.assetKind,
        buyPrice: product.price,
        currency: "COINS",
        rewardQuantity: product.rewardQuantity,
        suggestedSellPrice: resolveMarketSellPrice(product.price, product.assetKind),
        canAfford: inventory.coins >= product.price,
      })),
      sellableItems: inventory.items.map((item) => {
        const unitSellPrice = resolveMarketSellPrice(item.value, "ITEM");

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          type: item.type,
          img: item.img,
          effect: item.effect,
          levelRequirement: item.levelRequirement,
          quantity: item.quantity,
          unitSellPrice,
          totalSellPrice: unitSellPrice * item.quantity,
        };
      }),
      sellableEquipments: inventory.equipments.map((equipment) => ({
        id: equipment.id,
        name: equipment.name,
        category: equipment.category,
        type: equipment.type,
        img: equipment.img,
        effect: equipment.effect,
        isEquipped: equipment.isEquipped,
        unitSellPrice: resolveMarketSellPrice(equipment.value, "EQUIPMENT"),
      })),
    };
  }

  static async purchaseWithCoins(userId: string, input: PurchaseInput) {
    const product = await this.findActiveProduct(input.productId);

    if (!MARKET_BUYABLE_ASSET_KINDS.includes(product.assetKind)) {
      throw new AppError(
        409,
        "Produto indisponivel para compra com coins no mercado.",
        "INVALID_MARKET_PURCHASE"
      );
    }

    const inventory = await InventoryService.getInventoryByCharacter(userId, input.characterId);
    const totalCost = product.price * input.quantity;

    if (inventory.coins < totalCost) {
      throw new AppError(409, "Saldo insuficiente para a compra.", "INSUFFICIENT_COINS");
    }

    return prisma.$transaction(async (tx) => {
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          coins: {
            decrement: totalCost,
          },
        },
      });

      await this.grantProduct(tx, inventory.id, product, input.quantity);

      const transaction = await tx.transaction.create({
        data: {
          characterId: input.characterId,
          type: "MARKET_PURCHASE",
          value: -totalCost,
        },
      });

      return {
        transaction,
        inventory: {
          id: updatedInventory.id,
          coins: updatedInventory.coins,
        },
        purchased: {
          market: true,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          quantity: input.quantity,
          totalCost,
        },
      };
    });
  }

  static async sellToMarket(userId: string, input: MarketSaleInput) {
    const inventory = await InventoryService.getInventoryByCharacter(userId, input.characterId);

    return prisma.$transaction(async (tx) => {
      if (input.assetType === "ITEM") {
        const item = inventory.items.find((entry) => entry.id === input.assetId);

        if (!item) {
          throw new AppError(404, "Item nao encontrado no inventario.", "ITEM_NOT_FOUND");
        }

        if (input.quantity > item.quantity) {
          throw new AppError(409, "Quantidade maior que o saldo do item.", "INVALID_SELL_QUANTITY");
        }

        const unitPrice = resolveMarketSellPrice(item.value, "ITEM");
        const totalValue = unitPrice * input.quantity;

        if (input.quantity === item.quantity) {
          await tx.item.delete({
            where: { id: item.id },
          });
        } else {
          await tx.item.update({
            where: { id: item.id },
            data: {
              quantity: {
                decrement: input.quantity,
              },
            },
          });
        }

        const updatedInventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            coins: {
              increment: totalValue,
            },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            characterId: input.characterId,
            type: "MARKET_SALE",
            value: totalValue,
          },
        });

        return {
          transaction,
          sold: {
            assetType: "ITEM",
            assetId: item.id,
            name: item.name,
            quantity: input.quantity,
            unitPrice,
            totalValue,
          },
          inventory: {
            id: updatedInventory.id,
            coins: updatedInventory.coins,
          },
        };
      }

      if (input.quantity !== 1) {
        throw new AppError(
          400,
          "Equipamentos devem ser vendidos individualmente com quantity igual a 1.",
          "INVALID_SELL_QUANTITY"
        );
      }

      const equipment = inventory.equipments.find((entry) => entry.id === input.assetId);

      if (!equipment) {
        throw new AppError(404, "Equipamento nao encontrado no inventario.", "EQUIPMENT_NOT_FOUND");
      }

      if (equipment.isEquipped) {
        throw new AppError(
          409,
          "Desequipe o equipamento antes de vender no mercado.",
          "EQUIPMENT_EQUIPPED_FOR_SALE"
        );
      }

      const unitPrice = resolveMarketSellPrice(equipment.value, "EQUIPMENT");

      await tx.equipment.delete({
        where: { id: equipment.id },
      });

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          coins: {
            increment: unitPrice,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          characterId: input.characterId,
          type: "MARKET_SALE",
          value: unitPrice,
        },
      });

      return {
        transaction,
        sold: {
          assetType: "EQUIPMENT",
          assetId: equipment.id,
          name: equipment.name,
          quantity: 1,
          unitPrice,
          totalValue: unitPrice,
        },
        inventory: {
          id: updatedInventory.id,
          coins: updatedInventory.coins,
        },
      };
    });
  }

  static async createPaymentOrder(userId: string, input: CreatePaymentOrderInput) {
    await CharacterService.ensureOwnership(userId, input.characterId);
    const product = await this.findActiveProduct(input.productId);
    const providerReference = `order_${crypto.randomUUID()}`;

    const order = await prisma.paymentOrder.create({
      data: {
        userId,
        characterId: input.characterId,
        productId: product.id,
        quantity: input.quantity,
        unitPrice: product.price,
        totalPrice: product.price * input.quantity,
        currency: product.currency,
        provider: input.provider ?? "manual",
        providerReference,
      },
      include: {
        product: true,
      },
    });

    return order;
  }

  static async getPaymentOrders(userId: string) {
    return prisma.paymentOrder.findMany({
      where: { userId },
      include: {
        product: true,
        character: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async processPaymentWebhook(signature: string | undefined, input: PaymentWebhookInput) {
    if (!env.PAYMENT_WEBHOOK_SECRET) {
      throw new AppError(
        503,
        "Webhook de pagamento nao configurado no servidor.",
        "WEBHOOK_NOT_CONFIGURED"
      );
    }

    if (signature !== env.PAYMENT_WEBHOOK_SECRET) {
      throw new AppError(401, "Webhook nao autorizado.", "INVALID_WEBHOOK_SIGNATURE");
    }

    const order = await prisma.paymentOrder.findFirst({
      where: input.orderId
        ? { id: input.orderId }
        : { providerReference: input.providerReference },
      include: {
        product: true,
      },
    });

    if (!order) {
      throw new AppError(404, "Pedido de pagamento nao encontrado.", "PAYMENT_ORDER_NOT_FOUND");
    }

    if (order.status === PaymentOrderStatus.FULFILLED) {
      return order;
    }

    if (input.status === "FAILED" || input.status === "CANCELED") {
      return prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status:
            input.status === "FAILED"
              ? PaymentOrderStatus.FAILED
              : PaymentOrderStatus.CANCELED,
          failureReason: input.failureReason,
          providerPaymentId: input.providerPaymentId ?? order.providerPaymentId,
        },
        include: {
          product: true,
        },
      });
    }

    return prisma.$transaction(async (tx) => {
      const freshOrder = await tx.paymentOrder.findUnique({
        where: { id: order.id },
        include: {
          product: true,
          character: true,
        },
      });

      if (!freshOrder) {
        throw new AppError(404, "Pedido de pagamento nao encontrado.", "PAYMENT_ORDER_NOT_FOUND");
      }

      if (freshOrder.status === PaymentOrderStatus.FULFILLED) {
        return freshOrder;
      }

      const inventory = await tx.inventory.findFirst({
        where: { characterId: freshOrder.characterId },
      });

      if (!inventory) {
        throw new AppError(404, "Inventario nao encontrado para entrega.", "INVENTORY_NOT_FOUND");
      }

      await this.grantProduct(tx, inventory.id, freshOrder.product, freshOrder.quantity);

      await tx.transaction.create({
        data: {
          characterId: freshOrder.characterId,
          type:
            freshOrder.product.assetKind === ShopProductAssetKind.COINS
              ? "PAYMENT_COIN_TOPUP"
              : "PAYMENT_PRODUCT_FULFILLMENT",
          value:
            freshOrder.product.assetKind === ShopProductAssetKind.COINS
              ? freshOrder.product.rewardCoins * freshOrder.quantity
              : 0,
        },
      });

      return tx.paymentOrder.update({
        where: { id: freshOrder.id },
        data: {
          status: PaymentOrderStatus.FULFILLED,
          providerPaymentId: input.providerPaymentId ?? freshOrder.providerPaymentId,
          paidAt: freshOrder.paidAt ?? new Date(),
          fulfilledAt: new Date(),
          failureReason: null,
        },
        include: {
          product: true,
        },
      });
    });
  }

  private static async findActiveProduct(productId: string) {
    const product = await prisma.shopProduct.findFirst({
      where: {
        OR: [{ id: productId }, { slug: productId }],
        isActive: true,
      },
    });

    if (!product) {
      throw new AppError(404, "Produto nao encontrado.", "SHOP_PRODUCT_NOT_FOUND");
    }

    return product;
  }

  private static async grantProduct(
    tx: Prisma.TransactionClient,
    inventoryId: string,
    product: ShopProduct,
    quantity: number
  ) {
    if (product.assetKind === ShopProductAssetKind.COINS) {
      await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          coins: {
            increment: product.rewardCoins * quantity,
          },
        },
      });
      return;
    }

    if (product.assetKind === ShopProductAssetKind.ITEM) {
      const existing = await tx.item.findFirst({
        where: {
          inventoryId,
          name: product.name,
          category: product.category,
          type: product.type,
          img: product.img,
          effect: product.effect ?? null,
          levelRequirement: product.levelRequirement ?? null,
          value: product.price,
        },
      });

      if (existing) {
        await tx.item.update({
          where: { id: existing.id },
          data: {
            quantity: {
              increment: product.rewardQuantity * quantity,
            },
          },
        });
      } else {
        await tx.item.create({
          data: {
            inventoryId,
            name: product.name,
            value: product.price,
            category: product.category,
            type: product.type,
            img: product.img,
            effect: product.effect,
            levelRequirement: product.levelRequirement,
            quantity: product.rewardQuantity * quantity,
          },
        });
      }
      return;
    }

    const totalEquipments = product.rewardQuantity * quantity;

    for (let index = 0; index < totalEquipments; index += 1) {
      await tx.equipment.create({
        data: {
          inventoryId,
          name: product.name,
          value: product.price,
          category: product.category,
          type: product.type,
          img: product.img,
          effect: product.effect,
        },
      });
    }
  }
}
