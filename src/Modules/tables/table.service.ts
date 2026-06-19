import {
  CharacterReviewStatus,
  Prisma,
  TableMemberRole,
  TableMemberStatus,
  TableMissionSubmissionStatus,
  TableStatus,
  TableTimelineEventType,
} from "@prisma/client";
import { randomInt } from "crypto";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import { permissionDebug } from "../../utils/permissionDebug";
import {
  CreateTableCharacterInput,
  CreateCharacterTraitInput,
  CreateMissionSubmissionInput,
  CreateTableInput,
  CreateTableMissionInput,
  CreateTimelineEventInput,
  JoinTableInput,
  ReviewMissionSubmissionInput,
  ReviewTableCharacterInput,
  UpdateTableMissionInput,
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
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
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
              masterId: userId,
              name: input.name,
              joinCode,
              maxPlayers: MAX_TABLE_PLAYERS,
              members: {
                create: {
                  userId,
                  role: TableMemberRole.MASTER,
                  status: TableMemberStatus.ACTIVE,
                },
              },
            },
            include: tableInclude,
          });

          return this.formatTable(table, {
            role: TableMemberRole.MASTER,
            status: TableMemberStatus.ACTIVE,
          });
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

  static async createTableWithTimeline(userId: string, input: CreateTableInput) {
    const table = await this.createTable(userId, input);

    await this.createTimelineEventSafely({
      tableId: table.id,
      createdById: userId,
      title: "Mesa criada",
      description: `A mesa ${table.name} foi criada.`,
      type: "STORY",
    });

    return table;
  }

  static async listTables(userId: string) {
    const tables = await prisma.table.findMany({
      where: {
        OR: [
          { masterId: userId },
          {
            members: {
              some: {
                userId,
                status: TableMemberStatus.ACTIVE,
              },
            },
          },
        ],
      },
      include: tableInclude,
      orderBy: { createdAt: "desc" },
    });

    const formattedTables = tables.map((table) => {
      if (table.masterId === userId) {
        return this.formatTable(table, {
          role: TableMemberRole.MASTER,
          status: TableMemberStatus.ACTIVE,
        });
      }

      const membership = table.members.find(
        (member) =>
          member.userId === userId &&
          member.status === TableMemberStatus.ACTIVE
      );

      if (!membership) {
        throw new AppError(
          500,
          "Membro ativo nao encontrado para a mesa.",
          "TABLE_MEMBERSHIP_INCONSISTENT"
        );
      }

      return this.formatTable(table, membership);
    });

    permissionDebug("tables.list.result", {
      userId,
      tables: formattedTables.map((table) => ({
        tableId: table.id,
        masterId: table.masterId,
        currentUserRole: table.currentUserRole,
        memberStatus: table.memberStatus,
        isMaster: table.isMaster,
        membersCount: table.membersCount,
        includesJoinCode: "joinCode" in table,
      })),
    });

    return formattedTables;
  }

  static async getTable(userId: string, tableId: string) {
    const membership = await this.getTableForMember(userId, tableId);
    const table = this.formatTable(membership.table, membership);

    permissionDebug("tables.detail.result", {
      userId,
      tableId,
      masterId: table.masterId,
      currentUserRole: table.currentUserRole,
      memberStatus: table.memberStatus,
      isMaster: table.isMaster,
      membersCount: table.membersCount,
      includesJoinCode: "joinCode" in table,
    });

    return table;
  }

  static async joinTable(userId: string, input: JoinTableInput) {
    const joinCode = input.joinCode.trim().toUpperCase();
    const table = await prisma.table.findUnique({
      where: { joinCode },
      select: { id: true, status: true },
    });

    if (!table) {
      throw new AppError(404, "Mesa nao encontrada para este codigo.", "TABLE_NOT_FOUND");
    }

    if (table.status !== TableStatus.ACTIVE) {
      throw new AppError(409, "Esta mesa nao esta aceitando novos jogadores.", "TABLE_NOT_ACTIVE");
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

      if (lockedTable.status !== TableStatus.ACTIVE) {
        throw new AppError(409, "Esta mesa nao esta aceitando novos jogadores.", "TABLE_NOT_ACTIVE");
      }

      const existingMembership = lockedTable.members.find((member) => member.userId === userId);
      if (
        existingMembership?.status === TableMemberStatus.ACTIVE &&
        lockedTable.masterId !== userId
      ) {
        throw new AppError(409, "Usuario ja participa desta mesa.", "TABLE_ALREADY_JOINED");
      }

      const playerCount = lockedTable.members.filter(
        (member) =>
          member.role === TableMemberRole.PLAYER &&
          member.status === TableMemberStatus.ACTIVE
      ).length;
      if (playerCount >= lockedTable.maxPlayers) {
        throw new AppError(409, "Mesa atingiu o limite de jogadores.", "TABLE_FULL");
      }

      if (existingMembership) {
        await tx.tableMember.update({
          where: { id: existingMembership.id },
          data: {
            role:
              lockedTable.masterId === userId
                ? TableMemberRole.MASTER
                : TableMemberRole.PLAYER,
            status: TableMemberStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.tableMember.create({
          data: {
            tableId: table.id,
            userId,
            role:
              lockedTable.masterId === userId
                ? TableMemberRole.MASTER
                : TableMemberRole.PLAYER,
            status: TableMemberStatus.ACTIVE,
          },
        });
      }

      return tx.table.findUnique({
        where: { id: table.id },
        include: tableInclude,
      });
    });

    if (!joinedTable) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    const membership = joinedTable.members.find((member) => member.userId === userId);
    return this.formatTable(
      joinedTable,
      membership ?? {
        role: TableMemberRole.MASTER,
        status: TableMemberStatus.ACTIVE,
      }
    );
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

    const existingReview = await prisma.characterReview.findUnique({
      where: {
        tableId_characterId: {
          tableId,
          characterId,
        },
      },
      select: { status: true },
    });

    const review = await prisma.characterReview.upsert({
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

    if (
      review.status === CharacterReviewStatus.APPROVED &&
      existingReview?.status !== CharacterReviewStatus.APPROVED
    ) {
      await this.createTimelineEventSafely({
        tableId,
        characterId,
        createdById: userId,
        title: "Personagem aprovado",
        description: "Um personagem foi aprovado para participar da mesa.",
        type: "CHARACTER_APPROVED",
      });
    }

    return review;
  }

  static async listCharacterTraits(userId: string, tableId: string, characterId: string) {
    await this.ensureMembership(userId, tableId);
    await this.ensureTableCharacter(tableId, characterId);

    return prisma.characterTrait.findMany({
      where: { tableId, characterId },
      include: {
        createdBy: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async createCharacterTrait(
    userId: string,
    tableId: string,
    characterId: string,
    input: CreateCharacterTraitInput
  ) {
    await this.ensureMaster(userId, tableId);
    await this.ensureTableCharacter(tableId, characterId);

    return prisma.characterTrait.create({
      data: {
        tableId,
        characterId,
        type: input.type,
        name: input.name,
        description: input.description ?? null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  static async deleteCharacterTrait(
    userId: string,
    tableId: string,
    characterId: string,
    traitId: string
  ) {
    await this.ensureMaster(userId, tableId);
    await this.ensureTableCharacter(tableId, characterId);

    const trait = await prisma.characterTrait.findFirst({
      where: {
        id: traitId,
        tableId,
        characterId,
      },
      select: { id: true },
    });

    if (!trait) {
      throw new AppError(404, "Trait nao encontrada para este personagem.", "CHARACTER_TRAIT_NOT_FOUND");
    }

    await prisma.characterTrait.delete({
      where: { id: trait.id },
    });

    return { message: "Trait removida com sucesso." };
  }

  static async createMission(userId: string, tableId: string, input: CreateTableMissionInput) {
    await this.ensureMaster(userId, tableId);

    const mission = await prisma.tableMission.create({
      data: {
        tableId,
        title: input.title,
        description: input.description,
        objective: input.objective ?? null,
        isRequired: input.isRequired ?? true,
        dueDate: input.dueDate ?? null,
        createdById: userId,
      },
      include: this.missionInclude(),
    });

    await this.createTimelineEventSafely({
      tableId,
      createdById: userId,
      title: "Missao criada",
      description: mission.title,
      type: "MISSION_CREATED",
    });

    return mission;
  }

  static async listMissions(userId: string, tableId: string) {
    await this.ensureMembership(userId, tableId);

    return prisma.tableMission.findMany({
      where: { tableId },
      include: this.missionInclude(),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }

  static async getMission(userId: string, tableId: string, missionId: string) {
    const membership = await this.ensureMembership(userId, tableId);
    const mission = await this.getMissionForTable(tableId, missionId);

    const submissionsWhere =
      membership.role === TableMemberRole.MASTER ? undefined : { userId };

    return prisma.tableMission.findUnique({
      where: { id: mission.id },
      include: {
        ...this.missionInclude(),
        submissions: {
          where: submissionsWhere,
          include: this.submissionInclude(),
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  static async updateMission(
    userId: string,
    tableId: string,
    missionId: string,
    input: UpdateTableMissionInput
  ) {
    await this.ensureMaster(userId, tableId);
    await this.getMissionForTable(tableId, missionId);

    return prisma.tableMission.update({
      where: { id: missionId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.objective !== undefined ? { objective: input.objective } : {}),
        ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      },
      include: this.missionInclude(),
    });
  }

  static async createMissionSubmission(
    userId: string,
    tableId: string,
    missionId: string,
    input: CreateMissionSubmissionInput
  ) {
    await this.ensureMembership(userId, tableId);
    await this.getMissionForTable(tableId, missionId);
    await this.ensureApprovedTableCharacter(userId, tableId, input.characterId);

    return prisma.tableMissionSubmission.create({
      data: {
        missionId,
        characterId: input.characterId,
        userId,
        content: input.content,
      },
      include: this.submissionInclude(),
    });
  }

  static async listMissionSubmissions(userId: string, tableId: string, missionId: string) {
    const membership = await this.ensureMembership(userId, tableId);
    await this.getMissionForTable(tableId, missionId);

    return prisma.tableMissionSubmission.findMany({
      where: {
        missionId,
        ...(membership.role === TableMemberRole.MASTER ? {} : { userId }),
      },
      include: this.submissionInclude(),
      orderBy: { createdAt: "desc" },
    });
  }

  static async reviewMissionSubmission(
    userId: string,
    tableId: string,
    missionId: string,
    submissionId: string,
    input: ReviewMissionSubmissionInput
  ) {
    await this.ensureMaster(userId, tableId);
    await this.getMissionForTable(tableId, missionId);

    const submission = await prisma.tableMissionSubmission.findFirst({
      where: {
        id: submissionId,
        missionId,
        mission: {
          tableId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!submission) {
      throw new AppError(404, "Submissao de missao nao encontrada.", "MISSION_SUBMISSION_NOT_FOUND");
    }

    const updatedSubmission = await prisma.tableMissionSubmission.update({
      where: { id: submission.id },
      data: {
        status: input.status as TableMissionSubmissionStatus,
        masterNote: input.masterNote ?? null,
      },
      include: this.submissionInclude(),
    });

    if (
      updatedSubmission.status === TableMissionSubmissionStatus.APPROVED &&
      submission.status !== TableMissionSubmissionStatus.APPROVED
    ) {
      await this.createTimelineEventSafely({
        tableId,
        characterId: updatedSubmission.characterId,
        createdById: userId,
        title: "Missao aprovada",
        description: "Uma resposta de missao foi aprovada pelo mestre.",
        type: "MISSION_APPROVED",
      });
    }

    return updatedSubmission;
  }

  static async listTimelineEvents(userId: string, tableId: string) {
    await this.ensureMembership(userId, tableId);

    return prisma.tableTimelineEvent.findMany({
      where: { tableId },
      include: this.timelineEventInclude(),
      orderBy: { createdAt: "asc" },
    });
  }

  static async createTimelineEvent(
    userId: string,
    tableId: string,
    input: CreateTimelineEventInput
  ) {
    await this.ensureMaster(userId, tableId);

    if (input.characterId) {
      await this.ensureTableCharacter(tableId, input.characterId);
    }

    return prisma.tableTimelineEvent.create({
      data: {
        tableId,
        characterId: input.characterId ?? null,
        title: input.title,
        description: input.description,
        type: input.type,
        createdById: userId,
      },
      include: this.timelineEventInclude(),
    });
  }

  private static async getTableForMember(userId: string, tableId: string) {
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        OR: [
          { masterId: userId },
          {
            members: {
              some: {
                userId,
                status: TableMemberStatus.ACTIVE,
              },
            },
          },
        ],
      },
      include: tableInclude,
    });

    if (!table) {
      permissionDebug("table.detail.access.denied", {
        userId,
        tableId,
        reason: "table_not_found_or_no_active_membership",
      });
      throw new AppError(404, "Mesa nao encontrada ou acesso negado.", "TABLE_NOT_FOUND");
    }

    if (table.masterId === userId) {
      permissionDebug("table.detail.access.granted", {
        userId,
        tableId,
        masterId: table.masterId,
        source: "masterId_fallback",
        role: TableMemberRole.MASTER,
        status: TableMemberStatus.ACTIVE,
      });
      return {
        role: TableMemberRole.MASTER,
        status: TableMemberStatus.ACTIVE,
        table,
      };
    }

    const membership = table.members.find(
      (member) => member.userId === userId && member.status === TableMemberStatus.ACTIVE
    );

    permissionDebug("table.detail.access.granted", {
      userId,
      tableId,
      masterId: table.masterId,
      source: "active_membership",
      role: membership?.role ?? null,
      status: membership?.status ?? null,
    });

    return {
      ...membership!,
      table,
    };
  }

  private static async ensureMembership(userId: string, tableId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: {
        masterId: true,
        members: {
          where: {
            userId,
            status: TableMemberStatus.ACTIVE,
          },
          select: {
            role: true,
            status: true,
          },
          take: 1,
        },
      },
    });

    if (table?.masterId === userId) {
      permissionDebug("table.membership.granted", {
        userId,
        tableId,
        masterId: table.masterId,
        source: "masterId_fallback",
        role: TableMemberRole.MASTER,
        status: TableMemberStatus.ACTIVE,
      });
      return {
        role: TableMemberRole.MASTER,
        status: TableMemberStatus.ACTIVE,
      };
    }

    const membership = table?.members[0];
    if (membership) {
      permissionDebug("table.membership.granted", {
        userId,
        tableId,
        masterId: table?.masterId ?? null,
        source: "active_membership",
        role: membership.role,
        status: membership.status,
      });
      return membership;
    }

    if (!table) {
      permissionDebug("table.membership.denied", {
        userId,
        tableId,
        reason: "table_not_found",
      });
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    permissionDebug("table.membership.denied", {
      userId,
      tableId,
      masterId: table.masterId,
      reason: "no_active_membership",
    });
    throw new AppError(403, "Acesso restrito a membros da mesa.", "TABLE_MEMBER_REQUIRED");
  }

  private static async ensureMaster(userId: string, tableId: string) {
    const membership = await this.ensureMembership(userId, tableId);

    if (
      membership.role !== TableMemberRole.MASTER ||
      membership.status !== TableMemberStatus.ACTIVE
    ) {
      permissionDebug("table.master.denied", {
        userId,
        tableId,
        role: membership.role,
        status: membership.status,
      });
      throw new AppError(403, "Somente o mestre pode alterar o mundo da mesa.", "TABLE_MASTER_REQUIRED");
    }

    permissionDebug("table.master.granted", {
      userId,
      tableId,
      role: membership.role,
      status: membership.status,
    });
    return membership;
  }

  private static async ensureTableCharacter(tableId: string, characterId: string) {
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        tableId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!character) {
      throw new AppError(404, "Personagem da mesa nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }

    return character;
  }

  private static async ensureApprovedTableCharacter(
    userId: string,
    tableId: string,
    characterId: string
  ) {
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        tableId,
        userId,
        reviews: {
          some: {
            tableId,
            status: CharacterReviewStatus.APPROVED,
          },
        },
      },
      select: { id: true },
    });

    if (!character) {
      throw new AppError(
        403,
        "Envio exige personagem aprovado nesta mesa.",
        "APPROVED_TABLE_CHARACTER_REQUIRED"
      );
    }

    return character;
  }

  private static async getMissionForTable(tableId: string, missionId: string) {
    const mission = await prisma.tableMission.findFirst({
      where: {
        id: missionId,
        tableId,
      },
      select: { id: true },
    });

    if (!mission) {
      throw new AppError(404, "Missao da mesa nao encontrada.", "TABLE_MISSION_NOT_FOUND");
    }

    return mission;
  }

  private static missionInclude() {
    return {
      createdBy: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    } satisfies Prisma.TableMissionInclude;
  }

  private static submissionInclude() {
    return {
      user: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      character: {
        select: {
          id: true,
          name: true,
          tableId: true,
          class: true,
        },
      },
    } satisfies Prisma.TableMissionSubmissionInclude;
  }

  private static timelineEventInclude() {
    return {
      createdBy: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      character: {
        select: {
          id: true,
          name: true,
          tableId: true,
          class: true,
        },
      },
    } satisfies Prisma.TableTimelineEventInclude;
  }

  private static async createTimelineEventSafely(input: {
    tableId: string;
    characterId?: string;
    title: string;
    description: string;
    type: TableTimelineEventType;
    createdById: string;
  }) {
    try {
      await prisma.tableTimelineEvent.create({
        data: {
          tableId: input.tableId,
          characterId: input.characterId ?? null,
          title: input.title,
          description: input.description,
          type: input.type,
          createdById: input.createdById,
        },
      });
    } catch (error) {
      console.error("Failed to create table timeline event", {
        tableId: input.tableId,
        type: input.type,
        error,
      });
    }
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
    }>,
    currentMembership: {
      role: TableMemberRole;
      status: TableMemberStatus;
    }
  ) {
    const activeMembers = table.members.filter(
      (member) => member.status === TableMemberStatus.ACTIVE
    );
    const playerCount = activeMembers.filter(
      (member) => member.role === TableMemberRole.PLAYER
    ).length;
    const isMaster =
      currentMembership.role === TableMemberRole.MASTER &&
      currentMembership.status === TableMemberStatus.ACTIVE;

    return {
      id: table.id,
      name: table.name,
      description: table.description,
      status: table.status,
      masterId: table.masterId,
      currentUserRole: currentMembership.role,
      isMaster,
      memberStatus: currentMembership.status,
      membersCount: activeMembers.length,
      ...(isMaster ? { joinCode: table.joinCode, code: table.joinCode } : {}),
      maxPlayers: table.maxPlayers,
      playerCount,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      master: table.master,
      members: table.members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      world: table.world,
    };
  }
}
