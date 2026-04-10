import { PaymentOrderStatus, Prisma, ShopProduct, ShopProductAssetKind } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { InventoryService } from "../inventory/inventory.service";
import { CharacterService } from "../characters/character.service";
import { CreatePaymentOrderInput, PaymentWebhookInput, PurchaseInput } from "./shop.types";

export class ShopService {
  static async getCatalog() {
    return prisma.shopProduct.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  static async purchaseWithCoins(userId: string, input: PurchaseInput) {
    const product = await this.findActiveProduct(input.productId);

    if (product.assetKind === ShopProductAssetKind.COINS) {
      throw new AppError(
        409,
        "Pacotes de moedas devem ser adquiridos pelo fluxo de pagamento externo.",
        "INVALID_COIN_PURCHASE"
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
          type: "SHOP_PURCHASE_COINS",
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
          productId: product.id,
          slug: product.slug,
          name: product.name,
          quantity: input.quantity,
          totalCost,
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
