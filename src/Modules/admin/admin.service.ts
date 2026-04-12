import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import {
  CreateBountyInput,
  CreateMissionInput,
  CreateMonsterInput,
  CreateNpcInput,
  CreateShopProductInput,
  CreateTrainingInput,
  UpdateBountyInput,
  UpdateMissionInput,
  UpdateMonsterInput,
  UpdateNpcInput,
  UpdateShopProductInput,
  UpdateTrainingInput,
} from "./admin.types";

export class AdminService {
  static async listMonsters() {
    return prisma.monster.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
    });
  }

  static async createMonster(input: CreateMonsterInput) {
    return prisma.monster.create({
      data: input,
    });
  }

  static async updateMonster(monsterId: string, input: UpdateMonsterInput) {
    await this.ensureMonster(monsterId);

    return prisma.monster.update({
      where: { id: monsterId },
      data: input,
    });
  }

  static async deleteMonster(monsterId: string) {
    await this.ensureMonster(monsterId);

    const linkedBounties = await prisma.bountyHunt.count({
      where: { monsterId },
    });

    if (linkedBounties > 0) {
      throw new AppError(
        409,
        "Nao e possivel excluir monstro vinculado a bounties. Remova ou altere as bounties antes.",
        "MONSTER_IN_USE"
      );
    }

    await prisma.monster.delete({
      where: { id: monsterId },
    });

    return { message: "Monstro excluido com sucesso." };
  }

  static async listBounties() {
    return prisma.bountyHunt.findMany({
      include: {
        monster: true,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  static async createBounty(input: CreateBountyInput) {
    await this.ensureMonster(input.monsterId);

    return prisma.bountyHunt.create({
      data: {
        ...input,
        timeLimit: new Date(input.timeLimit),
        isActive: input.isActive ?? true,
        rewardItemQuantity: input.rewardItemQuantity ?? 1,
      },
      include: {
        monster: true,
      },
    });
  }

  static async updateBounty(bountyId: string, input: UpdateBountyInput) {
    await this.ensureBounty(bountyId);

    if (input.monsterId) {
      await this.ensureMonster(input.monsterId);
    }

    return prisma.bountyHunt.update({
      where: { id: bountyId },
      data: {
        ...input,
        ...(input.timeLimit ? { timeLimit: new Date(input.timeLimit) } : {}),
      },
      include: {
        monster: true,
      },
    });
  }

  static async deleteBounty(bountyId: string) {
    await this.ensureBounty(bountyId);

    await prisma.bountyHunt.delete({
      where: { id: bountyId },
    });

    return { message: "Bounty excluida com sucesso." };
  }

  static async listMissions() {
    return prisma.missionDefinition.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  static async createMission(input: CreateMissionInput) {
    return prisma.missionDefinition.create({
      data: {
        ...input,
        isActive: input.isActive ?? true,
        rewardItemQuantity: input.rewardItemQuantity ?? 1,
      },
    });
  }

  static async updateMission(missionId: string, input: UpdateMissionInput) {
    await this.ensureMission(missionId);

    return prisma.missionDefinition.update({
      where: { id: missionId },
      data: input,
    });
  }

  static async deleteMission(missionId: string) {
    await this.ensureMission(missionId);

    await prisma.missionDefinition.delete({
      where: { id: missionId },
    });

    return { message: "Missao excluida com sucesso." };
  }

  static async listTrainings() {
    return prisma.trainingDefinition.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  static async createTraining(input: CreateTrainingInput) {
    return prisma.trainingDefinition.create({
      data: {
        ...input,
        coinsReward: input.coinsReward ?? 0,
        cooldownSeconds: input.cooldownSeconds ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updateTraining(trainingId: string, input: UpdateTrainingInput) {
    await this.ensureTraining(trainingId);

    return prisma.trainingDefinition.update({
      where: { id: trainingId },
      data: input,
    });
  }

  static async deleteTraining(trainingId: string) {
    await this.ensureTraining(trainingId);

    await prisma.trainingDefinition.delete({
      where: { id: trainingId },
    });

    return { message: "Treinamento excluido com sucesso." };
  }

  static async listNpcs() {
    return prisma.npcDefinition.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  static async createNpc(input: CreateNpcInput) {
    return prisma.npcDefinition.create({
      data: {
        ...input,
        xpReward: input.xpReward ?? 0,
        coinsReward: input.coinsReward ?? 0,
        rewardItemQuantity: input.rewardItemQuantity ?? 1,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updateNpc(npcId: string, input: UpdateNpcInput) {
    await this.ensureNpc(npcId);

    return prisma.npcDefinition.update({
      where: { id: npcId },
      data: input,
    });
  }

  static async deleteNpc(npcId: string) {
    await this.ensureNpc(npcId);

    await prisma.npcDefinition.delete({
      where: { id: npcId },
    });

    return { message: "NPC excluido com sucesso." };
  }

  static async listShopProducts() {
    return prisma.shopProduct.findMany({
      orderBy: [{ isActive: "desc" }, { category: "asc" }, { name: "asc" }],
    });
  }

  static async createShopProduct(input: CreateShopProductInput) {
    return prisma.shopProduct.create({
      data: {
        ...input,
        currency: input.currency ?? "BRL",
        rewardCoins: input.rewardCoins ?? 0,
        rewardQuantity: input.rewardQuantity ?? 1,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updateShopProduct(productId: string, input: UpdateShopProductInput) {
    await this.ensureShopProduct(productId);

    return prisma.shopProduct.update({
      where: { id: productId },
      data: input,
    });
  }

  static async deleteShopProduct(productId: string) {
    await this.ensureShopProduct(productId);

    const linkedOrders = await prisma.paymentOrder.count({
      where: { productId },
    });

    if (linkedOrders > 0) {
      throw new AppError(
        409,
        "Nao e possivel excluir produto da loja com pedidos vinculados. Desative-o em vez de excluir.",
        "SHOP_PRODUCT_IN_USE"
      );
    }

    await prisma.shopProduct.delete({
      where: { id: productId },
    });

    return { message: "Produto da loja excluido com sucesso." };
  }

  private static async ensureMonster(monsterId: string) {
    const monster = await prisma.monster.findUnique({
      where: { id: monsterId },
    });

    if (!monster) {
      throw new AppError(404, "Monstro nao encontrado.", "MONSTER_NOT_FOUND");
    }

    return monster;
  }

  private static async ensureBounty(bountyId: string) {
    const bounty = await prisma.bountyHunt.findUnique({
      where: { id: bountyId },
    });

    if (!bounty) {
      throw new AppError(404, "Bounty nao encontrada.", "BOUNTY_NOT_FOUND");
    }

    return bounty;
  }

  private static async ensureMission(missionId: string) {
    const mission = await prisma.missionDefinition.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new AppError(404, "Missao nao encontrada.", "MISSION_NOT_FOUND");
    }

    return mission;
  }

  private static async ensureTraining(trainingId: string) {
    const training = await prisma.trainingDefinition.findUnique({
      where: { id: trainingId },
    });

    if (!training) {
      throw new AppError(404, "Treinamento nao encontrado.", "TRAINING_NOT_FOUND");
    }

    return training;
  }

  private static async ensureNpc(npcId: string) {
    const npc = await prisma.npcDefinition.findUnique({
      where: { id: npcId },
    });

    if (!npc) {
      throw new AppError(404, "NPC nao encontrado.", "NPC_NOT_FOUND");
    }

    return npc;
  }

  private static async ensureShopProduct(productId: string) {
    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError(404, "Produto da loja nao encontrado.", "SHOP_PRODUCT_NOT_FOUND");
    }

    return product;
  }
}
