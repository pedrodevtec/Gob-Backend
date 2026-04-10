import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import {
  CreateBountyInput,
  CreateMissionInput,
  CreateMonsterInput,
  CreateNpcInput,
  CreateTrainingInput,
  UpdateBountyInput,
  UpdateMissionInput,
  UpdateMonsterInput,
  UpdateNpcInput,
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
}
