import { CharacterReviewStatus, Prisma, TableMemberRole } from "@prisma/client";
import { randomInt } from "crypto";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import {
  CreateTableCharacterInput,
  CreateTableInput,
  JoinTableInput,
  ReviewTableCharacterInput,
  UpsertTableWorldInput,
} from "./table.types";

const MAX_TABLE_PLAYERS = 8;
const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const tableInclude = {
  master: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  },
  world: true,
} satisfies Prisma.TableInclude;

export class TableService {
  static async createTable(userId: string, input: CreateTableInput) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = await this.generateUniqueJoinCode();

      try {
        return await prisma.$transaction(async (tx) => {
          const table = await tx.table.create({
            data: {
              masterUserId: userId,
              name: input.name,
              joinCode,
              maxPlayers: MAX_TABLE_PLAYERS,
              members: {
                create: {
                  userId,
                  role: TableMemberRole.MASTER,
                },
              },
            },
            include: tableInclude,
          });

          return this.formatTable(table);
        });
      } catch (error) {
        if (this.isUniqueJoinCodeConflict(error) && attempt < 4) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError(500, "Nao foi possivel gerar codigo da mesa.", "JOIN_CODE_GENERATION_FAILED");
  }

  static async listTables(userId: string) {
    const memberships = await prisma.tableMember.findMany({
      where: { userId },
      include: {
        table: {
          include: tableInclude,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((membership) => this.formatTable(membership.table));
  }

  static async getTable(userId: string, tableId: string) {
    const table = await this.getTableForMember(userId, tableId);
    return this.formatTable(table);
  }

  static async joinTable(userId: string, input: JoinTableInput) {
    const table = await prisma.table.findUnique({
      where: { joinCode: input.joinCode },
      select: { id: true },
    });

    if (!table) {
      throw new AppError(404, "Mesa nao encontrada para este codigo.", "TABLE_NOT_FOUND");
    }

    const joinedTable = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Table" WHERE id = ${table.id} FOR UPDATE`;

      const lockedTable = await tx.table.findUnique({
        where: { id: table.id },
        include: {
          members: true,
        },
      });

      if (!lockedTable) {
        throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
      }

      if (lockedTable.members.some((member) => member.userId === userId)) {
        throw new AppError(409, "Usuario ja participa desta mesa.", "TABLE_ALREADY_JOINED");
      }

      const playerCount = lockedTable.members.filter(
        (member) => member.role === TableMemberRole.PLAYER
      ).length;
      if (playerCount >= lockedTable.maxPlayers) {
        throw new AppError(409, "Mesa atingiu o limite de jogadores.", "TABLE_FULL");
      }

      await tx.tableMember.create({
        data: {
          tableId: table.id,
          userId,
          role: TableMemberRole.PLAYER,
        },
      });

      return tx.table.findUnique({
        where: { id: table.id },
        include: tableInclude,
      });
    });

    if (!joinedTable) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    return this.formatTable(joinedTable);
  }

  static async getWorld(userId: string, tableId: string) {
    await this.ensureMembership(userId, tableId);

    const world = await prisma.tableWorld.findUnique({
      where: { tableId },
    });

    if (!world) {
      throw new AppError(404, "Mundo da mesa ainda nao foi criado.", "TABLE_WORLD_NOT_FOUND");
    }

    return world;
  }

  static async upsertWorld(userId: string, tableId: string, input: UpsertTableWorldInput) {
    await this.ensureMaster(userId, tableId);

    return prisma.tableWorld.upsert({
      where: { tableId },
      create: {
        tableId,
        campaignTitle: input.campaignTitle,
        summary: input.summary,
        tone: input.tone ?? null,
        rules: input.rules ?? Prisma.JsonNull,
        characterCreationCriteria: input.characterCreationCriteria ?? Prisma.JsonNull,
      },
      update: {
        campaignTitle: input.campaignTitle,
        summary: input.summary,
        tone: input.tone ?? null,
        rules: input.rules ?? Prisma.JsonNull,
        characterCreationCriteria: input.characterCreationCriteria ?? Prisma.JsonNull,
      },
    });
  }

  static async createCharacter(userId: string, tableId: string, input: CreateTableCharacterInput) {
    await this.ensureMembership(userId, tableId);

    return prisma.$transaction(async (tx) => {
      const character = await CharacterService.createCharacterRecord(tx, userId, input, {
        tableId,
      });

      const review = await tx.characterReview.create({
        data: {
          tableId,
          characterId: character.id,
        },
      });

      return {
        character,
        review,
      };
    });
  }

  static async listCharacters(userId: string, tableId: string) {
    await this.ensureMembership(userId, tableId);

    return prisma.character.findMany({
      where: { tableId },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        class: true,
        reviews: {
          where: { tableId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async reviewCharacter(
    userId: string,
    tableId: string,
    characterId: string,
    input: ReviewTableCharacterInput
  ) {
    await this.ensureMaster(userId, tableId);

    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        tableId,
      },
      select: { id: true },
    });

    if (!character) {
      throw new AppError(404, "Personagem da mesa nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }

    return prisma.characterReview.upsert({
      where: {
        tableId_characterId: {
          tableId,
          characterId,
        },
      },
      create: {
        tableId,
        characterId,
        status: input.status as CharacterReviewStatus,
        masterFeedback: input.masterFeedback ?? null,
      },
      update: {
        status: input.status as CharacterReviewStatus,
        masterFeedback: input.masterFeedback ?? null,
      },
    });
  }

  private static async getTableForMember(userId: string, tableId: string) {
    const membership = await prisma.tableMember.findUnique({
      where: {
        tableId_userId: {
          tableId,
          userId,
        },
      },
      include: {
        table: {
          include: tableInclude,
        },
      },
    });

    if (!membership) {
      throw new AppError(404, "Mesa nao encontrada ou acesso negado.", "TABLE_NOT_FOUND");
    }

    return membership.table;
  }

  private static async ensureMembership(userId: string, tableId: string) {
    const membership = await prisma.tableMember.findUnique({
      where: {
        tableId_userId: {
          tableId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Acesso restrito a membros da mesa.", "TABLE_MEMBER_REQUIRED");
    }

    return membership;
  }

  private static async ensureMaster(userId: string, tableId: string) {
    const membership = await this.ensureMembership(userId, tableId);

    if (membership.role !== TableMemberRole.MASTER) {
      throw new AppError(403, "Somente o mestre pode alterar o mundo da mesa.", "TABLE_MASTER_REQUIRED");
    }

    return membership;
  }

  private static async generateUniqueJoinCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const joinCode = this.generateJoinCode();
      const existing = await prisma.table.findUnique({
        where: { joinCode },
        select: { id: true },
      });

      if (!existing) {
        return joinCode;
      }
    }

    throw new AppError(500, "Nao foi possivel gerar codigo da mesa.", "JOIN_CODE_GENERATION_FAILED");
  }

  private static generateJoinCode() {
    let code = "";

    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      code += JOIN_CODE_ALPHABET[randomInt(0, JOIN_CODE_ALPHABET.length)];
    }

    return code;
  }

  private static isUniqueJoinCodeConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }

  private static formatTable(
    table: Prisma.TableGetPayload<{
      include: typeof tableInclude;
    }>
  ) {
    const playerCount = table.members.filter((member) => member.role === TableMemberRole.PLAYER).length;

    return {
      id: table.id,
      name: table.name,
      joinCode: table.joinCode,
      maxPlayers: table.maxPlayers,
      playerCount,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      master: table.master,
      members: table.members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        user: member.user,
      })),
      world: table.world,
    };
  }
}
