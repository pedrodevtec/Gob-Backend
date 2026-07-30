import {
  CharacterReviewStatus,
  CharacterTraitSuggestionStatus,
  Prisma,
  TableMemberRole,
  TableMemberStatus,
  TableMissionStatus,
  TableMissionSubmissionStatus,
  TableStatus,
  TableTimelineEventType,
} from "@prisma/client";
import { randomInt } from "crypto";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "../characters/character.service";
import { permissionDebug } from "../../utils/permissionDebug";
import { buildMasterOverviewGuidance } from "./table.overview";
import {
  CreateTableCharacterInput,
  CreateCharacterTraitSuggestionInput,
  CreateCharacterTraitInput,
  CreateMissionSubmissionInput,
  CreateTableInput,
  CreateTableMissionInput,
  CreateTimelineEventInput,
  JoinTableInput,
  ListCharacterTraitsQuery,
  ListTableCharactersQuery,
  ListTableMissionsQuery,
  ListTableSubmissionsQuery,
  ListTableTimelineQuery,
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
  _count: {
    select: {
      characters: true,
      characterReviews: true,
      missions: true,
      timelineEvents: true,
    },
  },
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
              settingId: input.settingId,
              episodeId: input.episodeId,
              contextVersionId: input.contextVersionId,
              name: input.name,
              description: input.description ?? "",
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
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
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
        _count: {
          select: {
            members: {
              where: { status: TableMemberStatus.ACTIVE },
            },
          },
        },
        world: {
          select: {
            campaignTitle: true,
          },
        },
        timelineEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedTables = tables.map((table) => {
      const currentUserRole =
        table.masterId === userId ? TableMemberRole.MASTER : table.members[0]?.role;

      if (!currentUserRole) {
        throw new AppError(
          500,
          "Membro ativo nao encontrado para a mesa.",
          "TABLE_MEMBERSHIP_INCONSISTENT"
        );
      }

      return {
        id: table.id,
        name: table.name,
        description: table.description,
        status: table.status,
        currentUserRole,
        isMaster: currentUserRole === TableMemberRole.MASTER,
        memberStatus: TableMemberStatus.ACTIVE,
        membersCount: table._count.members,
        worldTitle: table.world?.campaignTitle ?? null,
        latestTimelineEvent: table.timelineEvents[0] ?? null,
      };
    });

    permissionDebug("tables.list.result", {
      userId,
      tables: formattedTables.map((table) => ({
        tableId: table.id,
        currentUserRole: table.currentUserRole,
        memberStatus: table.memberStatus,
        isMaster: table.isMaster,
        membersCount: table.membersCount,
        includesJoinCode: false,
      })),
    });

    return formattedTables;
  }

  static async getDashboard(userId: string) {
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
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
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
        _count: {
          select: {
            members: {
              where: { status: TableMemberStatus.ACTIVE },
            },
          },
        },
        world: {
          select: {
            campaignTitle: true,
          },
        },
        timelineEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dashboardTables = tables.map((table) => {
      const membership = table.members[0];
      const currentUserRole =
        table.masterId === userId ? TableMemberRole.MASTER : membership?.role;

      if (!currentUserRole) {
        throw new AppError(
          500,
          "Membro ativo nao encontrado para a mesa.",
          "TABLE_MEMBERSHIP_INCONSISTENT"
        );
      }

      return {
        id: table.id,
        name: table.name,
        description: table.description,
        status: table.status,
        currentUserRole,
        isMaster: currentUserRole === TableMemberRole.MASTER,
        memberStatus: TableMemberStatus.ACTIVE,
        membersCount: table._count.members,
        worldTitle: table.world?.campaignTitle ?? null,
        latestTimelineEvent: table.timelineEvents[0] ?? null,
      };
    });

    const masterTableIds = dashboardTables
      .filter((table) => table.isMaster)
      .map((table) => table.id);
    const playerTableIds = dashboardTables
      .filter((table) => !table.isMaster)
      .map((table) => table.id);
    const accessibleTableIds = dashboardTables.map((table) => table.id);

    const [
      pendingCharacterReviewsCount,
      pendingCharacterReviews,
      activePlayerMissionsCount,
      activePlayerMissions,
      recentTimeline,
    ] = await prisma.$transaction([
      prisma.characterReview.count({
        where: {
          tableId: { in: masterTableIds },
          status: CharacterReviewStatus.PENDING,
        },
      }),
      prisma.characterReview.findMany({
        where: {
          tableId: { in: masterTableIds },
          status: CharacterReviewStatus.PENDING,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          status: true,
          masterFeedback: true,
          createdAt: true,
          updatedAt: true,
          table: {
            select: {
              id: true,
              name: true,
            },
          },
          character: {
            select: {
              id: true,
              name: true,
              level: true,
              user: {
                select: {
                  id: true,
                  nome: true,
                  email: true,
                },
              },
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.tableMission.count({
        where: {
          tableId: { in: playerTableIds },
          status: TableMissionStatus.ACTIVE,
        },
      }),
      prisma.tableMission.findMany({
        where: {
          tableId: { in: playerTableIds },
          status: TableMissionStatus.ACTIVE,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          objective: true,
          isRequired: true,
          status: true,
          dueDate: true,
          createdAt: true,
          table: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.tableTimelineEvent.findMany({
        where: {
          tableId: { in: accessibleTableIds },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          createdAt: true,
          table: {
            select: {
              id: true,
              name: true,
            },
          },
          character: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      summary: {
        totalTables: dashboardTables.length,
        masterTables: masterTableIds.length,
        playerTables: playerTableIds.length,
        pendingCharacterReviews: pendingCharacterReviewsCount,
        activePlayerMissions: activePlayerMissionsCount,
      },
      tables: dashboardTables,
      pendingCharacterReviews: pendingCharacterReviews.map((review) => ({
        ...review,
        character: {
          ...review.character,
          user: {
            id: review.character.user.id,
            name: review.character.user.nome,
            email: review.character.user.email,
          },
        },
      })),
      activePlayerMissions,
      recentTimeline: recentTimeline.map((event) => ({
        ...event,
        createdBy: {
          id: event.createdBy.id,
          name: event.createdBy.nome,
          email: event.createdBy.email,
        },
      })),
    };
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

  static async getMasterOverview(userId: string, tableId: string) {
    await this.ensureMaster(userId, tableId);

    const [
      table,
      memberGroups,
      characterReviewGroups,
      missionGroups,
      latestMission,
      submissionGroups,
      latestEvent,
    ] = await prisma.$transaction([
      prisma.table.findUnique({
        where: { id: tableId },
        select: {
          id: true,
          name: true,
          description: true,
          joinCode: true,
          maxPlayers: true,
          status: true,
          masterId: true,
          _count: {
            select: {
              members: {
                where: { status: TableMemberStatus.ACTIVE },
              },
              characters: true,
              timelineEvents: true,
            },
          },
          world: {
            select: {
              id: true,
              campaignTitle: true,
              summary: true,
              rules: true,
              characterCreationCriteria: true,
            },
          },
        },
      }),
      prisma.tableMember.groupBy({
        by: ["role"],
        where: { tableId, status: TableMemberStatus.ACTIVE },
        orderBy: { role: "asc" },
        _count: { _all: true },
      }),
      prisma.characterReview.groupBy({
        by: ["status"],
        where: { tableId },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.tableMission.groupBy({
        by: ["status"],
        where: { tableId },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.tableMission.findFirst({
        where: { tableId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
      }),
      prisma.tableMissionSubmission.groupBy({
        by: ["status"],
        where: {
          mission: { tableId },
        },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.tableTimelineEvent.findFirst({
        where: { tableId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          createdAt: true,
        },
      }),
    ]);

    if (!table) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    const aggregateCount = (
      group: { _count?: true | { _all?: number } } | undefined
    ): number =>
      group && typeof group._count === "object" ? group._count._all ?? 0 : 0;
    const countStatusGroup = (
      groups: Array<{
        status: string;
        _count?: true | { _all?: number };
      }>,
      status: string
    ): number => aggregateCount(groups.find((group) => group.status === status));
    const totalMembers = table._count.members;
    const totalPlayers = aggregateCount(
      memberGroups.find((group) => group.role === TableMemberRole.PLAYER)
    );
    const totalCharacters = table._count.characters;
    const pendingCharacters = countStatusGroup(
      characterReviewGroups,
      CharacterReviewStatus.PENDING
    );
    const approvedCharacters = countStatusGroup(
      characterReviewGroups,
      CharacterReviewStatus.APPROVED
    );
    const rejectedCharacters = countStatusGroup(
      characterReviewGroups,
      CharacterReviewStatus.REJECTED
    );
    const needsChangesCharacters = countStatusGroup(
      characterReviewGroups,
      CharacterReviewStatus.NEEDS_CHANGES
    );
    const totalMissions = missionGroups.reduce(
      (total, group) => total + aggregateCount(group),
      0
    );
    const activeMissions = countStatusGroup(missionGroups, TableMissionStatus.ACTIVE);
    const pendingSubmissions = countStatusGroup(
      submissionGroups,
      TableMissionSubmissionStatus.SUBMITTED
    );
    const reviewedSubmissions = submissionGroups.reduce(
      (total, group) =>
        group.status === TableMissionSubmissionStatus.SUBMITTED
          ? total
          : total + aggregateCount(group),
      0
    );
    const totalEvents = table._count.timelineEvents;
    const hasSummary = Boolean(table.world?.summary.trim());
    const hasRules = this.hasJsonContent(table.world?.rules);
    const hasCharacterCriteria = this.hasJsonContent(
      table.world?.characterCreationCriteria
    );

    const guidance = buildMasterOverviewGuidance({
      hasWorldSummary: hasSummary,
      hasPlayers: totalPlayers > 0,
      totalCharacters,
      pendingCharacters,
      totalMissions,
      hasActiveMission: activeMissions > 0,
      totalEvents,
      pendingSubmissions,
    });

    const overview = {
      table: {
        id: table.id,
        name: table.name,
        description: table.description,
        joinCode: table.joinCode,
        code: table.joinCode,
        maxPlayers: table.maxPlayers,
        status: table.status,
        membersCount: totalMembers,
        currentUserRole: TableMemberRole.MASTER,
        isMaster: true,
      },
      world: {
        hasWorld: Boolean(table.world),
        worldId: table.world?.id ?? null,
        worldTitle: table.world?.campaignTitle ?? null,
        hasSummary,
        hasRules,
        hasCharacterCriteria,
      },
      members: {
        totalMembers,
        totalPlayers,
        hasPlayers: totalPlayers > 0,
      },
      characters: {
        totalCharacters,
        pendingCharacters,
        approvedCharacters,
        rejectedCharacters,
        needsChangesCharacters,
      },
      missions: {
        totalMissions,
        activeMissions,
        hasActiveMission: activeMissions > 0,
        latestMission,
      },
      submissions: {
        pendingSubmissions,
        reviewedSubmissions,
      },
      timeline: {
        totalEvents,
        hasTimeline: totalEvents > 0,
        latestEvent,
      },
      ...guidance,
    };

    permissionDebug("table.master.overview.result", {
      userId,
      tableId,
      members: overview.members,
      characters: overview.characters,
      missions: {
        totalMissions,
        activeMissions,
      },
      submissions: overview.submissions,
      timeline: {
        totalEvents,
      },
      nextRecommendedAction: overview.nextRecommendedAction.key,
    });

    return overview;
  }

  static async getPlayerOverview(userId: string, tableId: string) {
    const roleContext = await this.getTableRoleContext(tableId, userId);
    const [table, character] = await prisma.$transaction([
      prisma.table.findUnique({
        where: { id: tableId },
        select: {
          id: true,
          name: true,
          description: true,
          world: true,
        },
      }),
      prisma.character.findFirst({
        where: { tableId, userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          name: true,
          level: true,
          createdAt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          reviews: {
            where: { tableId },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              status: true,
              masterFeedback: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    if (!table) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    const characterId = character?.id;
    const [appliedTraits, traitSuggestions, activeMissions, recentSubmissions, recentTimeline] =
      await prisma.$transaction([
        characterId
          ? prisma.characterTrait.findMany({
              where: { tableId, characterId },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: {
                id: true,
                type: true,
                name: true,
                description: true,
                createdAt: true,
              },
            })
          : prisma.characterTrait.findMany({
              where: { id: { in: [] } },
              select: {
                id: true,
                type: true,
                name: true,
                description: true,
                createdAt: true,
              },
            }),
        characterId
          ? prisma.characterTraitSuggestion.findMany({
              where: {
                tableId,
                characterId,
                status: CharacterTraitSuggestionStatus.SUGGESTED,
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 5,
              select: {
                id: true,
                type: true,
                name: true,
                description: true,
                category: true,
                value: true,
                source: true,
                status: true,
                createdAt: true,
              },
            })
          : prisma.characterTraitSuggestion.findMany({
              where: { id: { in: [] } },
              select: {
                id: true,
                type: true,
                name: true,
                description: true,
                category: true,
                value: true,
                source: true,
                status: true,
                createdAt: true,
              },
            }),
        prisma.tableMission.findMany({
          where: { tableId, status: TableMissionStatus.ACTIVE },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            objective: true,
            isRequired: true,
            status: true,
            dueDate: true,
            createdAt: true,
            submissions: {
              where: { characterId: characterId ?? "__no-character__" },
              select: {
                id: true,
                status: true,
                masterNote: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        }),
        prisma.tableMissionSubmission.findMany({
          where: {
            userId,
            mission: { tableId },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            status: true,
            content: true,
            masterNote: true,
            createdAt: true,
            updatedAt: true,
            mission: {
              select: {
                id: true,
                title: true,
              },
            },
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.tableTimelineEvent.findMany({
          where: { tableId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            createdAt: true,
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

    const review = character?.reviews[0] ?? null;
    const reviewStatus = review?.status ?? null;
    const missionsWithoutSubmission = activeMissions.filter(
      (mission) => mission.submissions.length === 0
    );
    const pendingReviewSubmissions = recentSubmissions.filter(
      (submission) => submission.status === TableMissionSubmissionStatus.SUBMITTED
    );
    const completedSubmissions = recentSubmissions.filter(
      (submission) => submission.status !== TableMissionSubmissionStatus.SUBMITTED
    );

    return {
      table: {
        id: table.id,
        name: table.name,
        description: table.description,
        currentUserRole: roleContext.role,
        isMaster: roleContext.isMaster,
        memberStatus: roleContext.status,
      },
      world: this.formatWorld(table.world),
      character: character
        ? {
            id: character.id,
            name: character.name,
            className: character.class.name,
            level: character.level,
            reviewStatus,
            masterFeedback: review?.masterFeedback ?? null,
            createdAt: character.createdAt,
          }
        : null,
      traits: {
        applied: appliedTraits,
        suggestions: traitSuggestions,
      },
      missions: {
        active: activeMissions,
        completed: completedSubmissions.map((submission) => submission.mission),
        pendingReview: pendingReviewSubmissions.map((submission) => submission.mission),
      },
      submissions: {
        recent: recentSubmissions,
      },
      timeline: {
        recent: recentTimeline,
      },
      nextRecommendedAction: this.buildPlayerNextAction({
        hasCharacter: Boolean(character),
        reviewStatus,
        hasActiveMissionWithoutSubmission: missionsWithoutSubmission.length > 0,
        hasPendingReviewSubmission: pendingReviewSubmissions.length > 0,
        hasTimeline: recentTimeline.length > 0,
      }),
    };
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

    if (table.status !== TableStatus.RECRUITING) {
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

      if (lockedTable.status !== TableStatus.RECRUITING) {
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

    return this.formatWorld(world);
  }

  static async upsertWorld(userId: string, tableId: string, input: UpsertTableWorldInput) {
    await this.ensureMaster(userId, tableId);

    const world = await prisma.tableWorld.upsert({
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

    return this.formatWorld(world);
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

  static async getMyCharacter(userId: string, tableId: string) {
    await this.ensureMembership(userId, tableId);

    const character = await prisma.character.findFirst({
      where: { tableId, userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        tableId: true,
        userId: true,
        name: true,
        level: true,
        status: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        reviews: {
          where: { tableId },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            masterFeedback: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!character) {
      return null;
    }

    const review = character.reviews[0] ?? null;
    return {
      id: character.id,
      tableId: character.tableId,
      userId: character.userId,
      name: character.name,
      level: character.level,
      status: character.status,
      class: character.class,
      reviewStatus: review?.status ?? null,
      masterFeedback: review?.masterFeedback ?? null,
      review,
      createdAt: character.createdAt,
    };
  }

  static async listCharacters(
    userId: string,
    tableId: string,
    query: ListTableCharactersQuery
  ) {
    await this.ensureMembership(userId, tableId);

    const characters = await prisma.character.findMany({
      where: {
        tableId,
        ...(query.reviewStatus
          ? {
              reviews: {
                some: {
                  tableId,
                  status: query.reviewStatus,
                },
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        tableId: true,
        userId: true,
        name: true,
        level: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        reviews: {
          where: { tableId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            tableId: true,
            characterId: true,
            status: true,
            masterFeedback: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return this.toCursorPage(characters, query.limit);
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

  static async listCharacterTraits(
    userId: string,
    tableId: string,
    characterId: string,
    query: ListCharacterTraitsQuery
  ) {
    await this.ensureMembership(userId, tableId);
    await this.ensureTableCharacter(tableId, characterId);

    const traits = await prisma.characterTrait.findMany({
      where: { tableId, characterId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        characterId: true,
        tableId: true,
        type: true,
        name: true,
        description: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return this.toCursorPage(traits, query.limit);
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

  static async listCharacterTraitSuggestions(
    userId: string,
    tableId: string,
    characterId: string
  ) {
    const membership = await this.ensureMembership(userId, tableId);
    const character = await this.ensureCharacterBelongsToTable(characterId, tableId);

    if (membership.role !== TableMemberRole.MASTER && character.userId !== userId) {
      throw new AppError(403, "Acesso restrito ao personagem da mesa.", "TABLE_CHARACTER_FORBIDDEN");
    }

    return prisma.characterTraitSuggestion.findMany({
      where: { tableId, characterId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        tableId: true,
        characterId: true,
        type: true,
        name: true,
        description: true,
        category: true,
        value: true,
        source: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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

  static async createCharacterTraitSuggestion(
    userId: string,
    tableId: string,
    characterId: string,
    input: CreateCharacterTraitSuggestionInput
  ) {
    await this.ensureTableMaster(tableId, userId);
    await this.ensureCharacterBelongsToTable(characterId, tableId);

    return prisma.characterTraitSuggestion.create({
      data: {
        tableId,
        characterId,
        type: input.type,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        value: input.value ?? null,
        source: input.source ?? "MASTER",
        createdById: userId,
      },
    });
  }

  static async applyCharacterTraitSuggestion(
    userId: string,
    tableId: string,
    characterId: string,
    suggestionId: string
  ) {
    await this.ensureTableMaster(tableId, userId);
    await this.ensureCharacterBelongsToTable(characterId, tableId);

    const suggestion = await prisma.characterTraitSuggestion.findFirst({
      where: { id: suggestionId, tableId, characterId },
    });

    if (!suggestion) {
      throw new AppError(404, "Sugestao de trait nao encontrada.", "CHARACTER_TRAIT_SUGGESTION_NOT_FOUND");
    }

    if (suggestion.status !== CharacterTraitSuggestionStatus.SUGGESTED) {
      throw new AppError(409, "Sugestao de trait ja foi processada.", "CHARACTER_TRAIT_SUGGESTION_ALREADY_PROCESSED");
    }

    const result = await prisma.$transaction(async (tx) => {
      const trait = await tx.characterTrait.create({
        data: {
          tableId,
          characterId,
          type: suggestion.type,
          name: suggestion.name,
          description: suggestion.description,
          createdById: userId,
        },
      });

      const updatedSuggestion = await tx.characterTraitSuggestion.update({
        where: { id: suggestion.id },
        data: { status: CharacterTraitSuggestionStatus.APPLIED },
      });

      return { trait, suggestion: updatedSuggestion };
    });

    await this.createTimelineEventSafely({
      tableId,
      characterId,
      createdById: userId,
      title: "Trait aplicada",
      description: result.trait.name,
      type: "MASTER_NOTE",
    });

    return result;
  }

  static async dismissCharacterTraitSuggestion(
    userId: string,
    tableId: string,
    characterId: string,
    suggestionId: string
  ) {
    await this.ensureTableMaster(tableId, userId);
    await this.ensureCharacterBelongsToTable(characterId, tableId);

    const suggestion = await prisma.characterTraitSuggestion.findFirst({
      where: { id: suggestionId, tableId, characterId },
      select: { id: true },
    });

    if (!suggestion) {
      throw new AppError(404, "Sugestao de trait nao encontrada.", "CHARACTER_TRAIT_SUGGESTION_NOT_FOUND");
    }

    return prisma.characterTraitSuggestion.update({
      where: { id: suggestion.id },
      data: { status: CharacterTraitSuggestionStatus.DISMISSED },
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

  static async listMissions(
    userId: string,
    tableId: string,
    query: ListTableMissionsQuery
  ) {
    await this.ensureMembership(userId, tableId);

    const missions = await prisma.tableMission.findMany({
      where: {
        tableId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        tableId: true,
        title: true,
        description: true,
        objective: true,
        isRequired: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
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
      },
    });

    return this.toCursorPage(missions, query.limit);
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
    await this.ensureApprovedTableCharacter(input.characterId, tableId, userId);

    const existingOpenSubmission = await prisma.tableMissionSubmission.findFirst({
      where: {
        missionId,
        characterId: input.characterId,
        status: TableMissionSubmissionStatus.SUBMITTED,
      },
      select: { id: true },
    });

    if (existingOpenSubmission) {
      throw new AppError(409, "Ja existe uma resposta aguardando revisao para esta missao.", "MISSION_SUBMISSION_ALREADY_PENDING");
    }

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

  static async listTableSubmissions(
    userId: string,
    tableId: string,
    query: ListTableSubmissionsQuery
  ) {
    const membership = await this.ensureMembership(userId, tableId);

    return this.findTableSubmissions(
      tableId,
      query,
      membership.role === TableMemberRole.MASTER ? undefined : userId
    );
  }

  static async listMyTableSubmissions(
    userId: string,
    tableId: string,
    query: ListTableSubmissionsQuery
  ) {
    await this.ensureMembership(userId, tableId);
    return this.findTableSubmissions(tableId, query, userId);
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

  static async listTimelineEvents(
    userId: string,
    tableId: string,
    query: ListTableTimelineQuery
  ) {
    await this.ensureMembership(userId, tableId);

    const events = await prisma.tableTimelineEvent.findMany({
      where: { tableId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        tableId: true,
        characterId: true,
        title: true,
        description: true,
        type: true,
        createdAt: true,
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
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.toCursorPage(events, query.limit);
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

  /**
   * User is the global account. TableMember is that user's active seat/role inside
   * one table; it is not the same thing as the player's campaign Character.
   */
  static async ensureActiveTableMember(tableId: string, userId: string) {
    return this.ensureMembership(userId, tableId);
  }

  /**
   * Table MASTER is a table-scoped TableMember role. A global ADMIN account role
   * does not grant master permissions inside a campaign table.
   */
  static async ensureTableMaster(tableId: string, userId: string) {
    return this.ensureMaster(userId, tableId);
  }

  /**
   * Returns the authenticated user's table-scoped membership role/status for UI
   * decisions without treating TableMember as a playable Character.
   */
  static async getTableRoleContext(tableId: string, userId: string) {
    const membership = await this.ensureActiveTableMember(tableId, userId);
    return {
      role: membership.role,
      status: membership.status,
      isMaster:
        membership.role === TableMemberRole.MASTER &&
        membership.status === TableMemberStatus.ACTIVE,
    };
  }

  /**
   * Character is the player's campaign persona inside a table; this validates
   * table scope only and does not prove the authenticated user owns it.
   */
  static async ensureCharacterBelongsToTable(characterId: string, tableId: string) {
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        tableId,
      },
      select: {
        id: true,
        userId: true,
        tableId: true,
      },
    });

    if (!character) {
      throw new AppError(404, "Personagem da mesa nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }

    return character;
  }

  /**
   * Validates Character ownership by User. This is intentionally separate from
   * TableMember checks because membership and playable character are distinct.
   */
  static async ensureCharacterBelongsToUser(characterId: string, userId: string) {
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        tableId: true,
      },
    });

    if (!character) {
      throw new AppError(403, "Acesso negado ao personagem.", "CHARACTER_FORBIDDEN");
    }

    return character;
  }

  /**
   * Mission submissions use Character identity. The character must belong to
   * the requested table, belong to the authenticated User, and be approved.
   */
  static async ensureApprovedTableCharacter(
    characterId: string,
    tableId: string,
    userId: string
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
      select: { id: true, userId: true, tableId: true },
    });

    if (!character) {
      throw new AppError(
        403,
        "Você precisa criar e aprovar um personagem antes de enviar missões.",
        "APPROVED_TABLE_CHARACTER_REQUIRED"
      );
    }

    return character;
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

  static async ensureMaster(userId: string, tableId: string) {
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
    return this.ensureCharacterBelongsToTable(characterId, tableId);
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

  private static toCursorPage<T extends { id: string }>(records: T[], limit: number) {
    const hasNextPage = records.length > limit;
    const items = hasNextPage ? records.slice(0, limit) : records;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null,
    };
  }

  private static async findTableSubmissions(
    tableId: string,
    query: ListTableSubmissionsQuery,
    userId?: string
  ) {
    const submissions = await prisma.tableMissionSubmission.findMany({
      where: {
        mission: { tableId },
        ...(query.status ? { status: query.status } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        status: true,
        content: true,
        masterNote: true,
        createdAt: true,
        updatedAt: true,
        mission: {
          select: {
            id: true,
            title: true,
          },
        },
        character: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    const hasNextPage = submissions.length > query.limit;
    const page = hasNextPage ? submissions.slice(0, query.limit) : submissions;

    return {
      items: page.map((submission) => ({
        id: submission.id,
        status: submission.status,
        content: submission.content,
        masterNote: submission.masterNote,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        mission: submission.mission,
        character: submission.character,
        user: {
          id: submission.user.id,
          name: submission.user.nome,
          email: submission.user.email,
        },
      })),
      nextCursor: hasNextPage ? page[page.length - 1]?.id ?? null : null,
    };
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

  private static hasJsonContent(value: Prisma.JsonValue | null | undefined): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "object") {
      return Object.keys(value).length > 0;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return true;
  }

  private static jsonText(value: Prisma.JsonValue | null | undefined): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const text = (value as Record<string, unknown>).text;
      if (typeof text === "string") {
        return text;
      }
    }

    return JSON.stringify(value);
  }

  // TableWorld JSON can be stored as either { text } or structured objects; this
  // DTO keeps player/master clients on stable text-friendly fields.
  private static formatWorld(
    world:
      | {
          id?: string;
          campaignTitle: string;
          summary: string;
          tone: string | null;
          rules: Prisma.JsonValue | null;
          characterCreationCriteria: Prisma.JsonValue | null;
          createdAt?: Date;
          updatedAt?: Date;
        }
      | null
  ) {
    if (!world) {
      return null;
    }

    return {
      id: world.id,
      title: world.campaignTitle,
      campaignTitle: world.campaignTitle,
      summary: world.summary,
      tone: world.tone,
      rules: world.rules,
      characterCreationCriteria: world.characterCreationCriteria,
      rulesText: this.jsonText(world.rules),
      characterCreationCriteriaText: this.jsonText(world.characterCreationCriteria),
      createdAt: world.createdAt,
      updatedAt: world.updatedAt,
    };
  }

  private static buildPlayerNextAction(input: {
    hasCharacter: boolean;
    reviewStatus: CharacterReviewStatus | null;
    hasActiveMissionWithoutSubmission: boolean;
    hasPendingReviewSubmission: boolean;
    hasTimeline: boolean;
  }) {
    if (!input.hasCharacter) {
      return {
        key: "CREATE_CHARACTER",
        title: "Criar personagem",
        description: "Crie um personagem para participar da mesa.",
        ctaLabel: "Criar personagem",
      };
    }

    if (input.reviewStatus === CharacterReviewStatus.PENDING) {
      return {
        key: "WAIT_APPROVAL",
        title: "Aguardar aprovacao",
        description: "Seu personagem esta aguardando revisao do mestre.",
        ctaLabel: "Ver personagem",
      };
    }

    if (
      input.reviewStatus === CharacterReviewStatus.REJECTED ||
      input.reviewStatus === CharacterReviewStatus.NEEDS_CHANGES
    ) {
      return {
        key: "UPDATE_CHARACTER",
        title: "Ajustar personagem",
        description: "Revise o feedback do mestre antes de continuar.",
        ctaLabel: "Editar personagem",
      };
    }

    if (
      input.reviewStatus === CharacterReviewStatus.APPROVED &&
      input.hasActiveMissionWithoutSubmission
    ) {
      return {
        key: "START_MISSION",
        title: "Responder missao",
        description: "Ha missoes ativas aguardando sua resposta.",
        ctaLabel: "Ver missoes",
      };
    }

    if (input.hasPendingReviewSubmission) {
      return {
        key: "WAIT_REVIEW",
        title: "Aguardar revisao",
        description: "Sua resposta foi enviada e aguarda feedback do mestre.",
        ctaLabel: "Ver envios",
      };
    }

    return {
      key: input.hasTimeline ? "READ_TIMELINE" : "CONTINUE_CAMPAIGN",
      title: input.hasTimeline ? "Ler timeline" : "Continuar campanha",
      description: input.hasTimeline
        ? "Confira os acontecimentos recentes da campanha."
        : "Acompanhe a mesa enquanto novas cenas sao criadas.",
      ctaLabel: input.hasTimeline ? "Abrir timeline" : "Ver mesa",
    };
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
      counts: {
        members: activeMembers.length,
        characters: table._count.characters,
        characterReviews: table._count.characterReviews,
        missions: table._count.missions,
        timelineEvents: table._count.timelineEvents,
      },
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
      world: this.formatWorld(table.world),
    };
  }
}
