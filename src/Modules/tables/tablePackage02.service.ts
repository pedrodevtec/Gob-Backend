import crypto from "crypto";
import {
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
  Prisma,
  TableInvitationStatus,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { TableAuthorizationService } from "./tableAuthorization.service";
import {
  AcceptTableInvitationInput,
  CreateTableInput,
  CreateTableInvitationInput,
  UpdateTableInput,
} from "./table.types";

const JOIN_CODE_LENGTH = 6;
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_TOKEN_BYTES = 32;
const DEFAULT_INVITATION_TTL_HOURS = 72;

type TablePackageDb = typeof defaultPrisma;

const tableSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  masterId: true,
  settingId: true,
  episodeId: true,
  contextVersionId: true,
  joinCode: true,
  maxPlayers: true,
  createdAt: true,
  updatedAt: true,
  setting: { select: { id: true, stableKey: true, title: true } },
  episode: { select: { id: true, stableKey: true, title: true } },
  contextVersion: { select: { id: true, version: true, layer: true, status: true } },
  members: {
    where: { status: TableMemberStatus.ACTIVE },
    select: {
      id: true,
      userId: true,
      role: true,
      status: true,
      joinedAt: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, nome: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  },
} satisfies Prisma.TableSelect;

export class TablePackage02Service {
  private static db: TablePackageDb = defaultPrisma;

  static setDbForTests(db: TablePackageDb): void {
    this.db = db;
    TableAuthorizationService.setDbForTests(db);
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
    TableAuthorizationService.resetDbForTests();
  }

  static generateInvitationToken(): string {
    return crypto.randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
  }

  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token, "utf8").digest("hex");
  }

  static async createTable(userId: string, input: CreateTableInput) {
    await this.ensureVerifiedUser(userId);
    await this.ensurePublishedContextSelection(input.settingId, input.episodeId, input.contextVersionId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const joinCode = await this.generateUniqueJoinCode();
      try {
        const table = await this.db.$transaction(async (tx) => {
          return tx.table.create({
            data: {
              masterId: userId,
              settingId: input.settingId,
              episodeId: input.episodeId,
              contextVersionId: input.contextVersionId,
              name: input.name,
              description: input.description ?? "",
              joinCode,
              status: TableStatus.RECRUITING,
              members: {
                create: {
                  userId,
                  role: TableMemberRole.MASTER,
                  status: TableMemberStatus.ACTIVE,
                },
              },
            },
            select: tableSelect,
          });
        });

        return this.formatTable(table, userId);
      } catch (error) {
        if (this.isUniqueConflict(error) && attempt < 4) {
          continue;
        }
        throw error;
      }
    }

    throw new AppError(500, "Nao foi possivel gerar identificador estavel da mesa.", "TABLE_IDENTIFIER_FAILED");
  }

  static async listTables(userId: string) {
    const tables = await this.db.table.findMany({
      where: {
        members: {
          some: {
            userId,
            status: TableMemberStatus.ACTIVE,
          },
        },
      },
      select: tableSelect,
      orderBy: { createdAt: "desc" },
    });

    return tables.map((table) => this.formatTable(table, userId));
  }

  static async getTable(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMember(tableId, userId);
    const table = await this.db.table.findUnique({ where: { id: tableId }, select: tableSelect });
    if (!table) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    return this.formatTable(table, userId);
  }

  static async updateTable(userId: string, tableId: string, input: UpdateTableInput) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    const table = await this.db.table.update({
      where: { id: tableId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      select: tableSelect,
    });

    return this.formatTable(table, userId);
  }

  static async listMembers(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMember(tableId, userId);
    const members = await this.db.tableMember.findMany({
      where: { tableId, status: TableMemberStatus.ACTIVE },
      include: { user: { select: { id: true, nome: true, email: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return members.map((member) => ({
      id: member.id,
      tableId: member.tableId,
      userId: member.userId,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user,
    }));
  }

  static async createInvitation(userId: string, tableId: string, input: CreateTableInvitationInput) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    await this.ensureVerifiedUser(userId);

    const token = this.generateInvitationToken();
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.expiresInHours ?? DEFAULT_INVITATION_TTL_HOURS) * 60 * 60_000);

    const invitation = await this.db.tableInvitation.create({
      data: {
        tableId,
        invitedEmail: input.email.toLowerCase(),
        intendedRole: TableMemberRole.PLAYER,
        tokenHash,
        expiresAt,
        invitedById: userId,
      },
    });

    return {
      invitation: this.formatInvitation(invitation),
      ...(env.NODE_ENV === "production" ? {} : { token }),
    };
  }

  static async listPendingInvitations(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    const invitations = await this.db.tableInvitation.findMany({
      where: { tableId, status: TableInvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((invitation) => this.formatInvitation(invitation));
  }

  static async revokeInvitation(userId: string, tableId: string, invitationId: string) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    const invitation = await this.db.tableInvitation.findFirst({
      where: { id: invitationId, tableId },
    });
    if (!invitation) {
      throw new AppError(404, "Convite nao encontrado.", "TABLE_INVITATION_NOT_FOUND");
    }
    if (invitation.status !== TableInvitationStatus.PENDING) {
      throw new AppError(409, "Convite nao esta pendente.", "TABLE_INVITATION_NOT_PENDING");
    }

    const revoked = await this.db.tableInvitation.update({
      where: { id: invitation.id },
      data: { status: TableInvitationStatus.REVOKED, revokedAt: new Date() },
    });

    return this.formatInvitation(revoked);
  }

  static async acceptInvitation(userId: string, input: AcceptTableInvitationInput) {
    const user = await this.ensureVerifiedUser(userId);
    const tokenHash = this.hashToken(input.token);
    const now = new Date();

    const result = await this.db.$transaction(async (tx) => {
      const invitation = await tx.tableInvitation.findUnique({ where: { tokenHash } });
      if (!invitation) {
        throw new AppError(400, "Convite invalido.", "TABLE_INVITATION_INVALID");
      }

      if (invitation.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
        throw new AppError(403, "Convite nao pertence ao usuario autenticado.", "TABLE_INVITATION_IDENTITY_MISMATCH");
      }

      const existingActive = await tx.tableMember.findFirst({
        where: { tableId: invitation.tableId, userId, status: TableMemberStatus.ACTIVE },
      });

      if (invitation.status === TableInvitationStatus.ACCEPTED && invitation.acceptedById === userId && existingActive) {
        return { invitation, membership: existingActive };
      }

      if (invitation.status !== TableInvitationStatus.PENDING) {
        throw new AppError(409, "Convite nao esta pendente.", "TABLE_INVITATION_NOT_PENDING");
      }

      if (invitation.expiresAt <= now) {
        await tx.tableInvitation.update({
          where: { id: invitation.id },
          data: { status: TableInvitationStatus.EXPIRED },
        });
        throw new AppError(409, "Convite expirado.", "TABLE_INVITATION_EXPIRED");
      }

      if (existingActive) {
        throw new AppError(409, "Usuario ja participa desta mesa.", "TABLE_ALREADY_JOINED");
      }

      const claimed = await tx.tableInvitation.updateMany({
        where: {
          id: invitation.id,
          status: TableInvitationStatus.PENDING,
          expiresAt: { gt: now },
        },
        data: {
          status: TableInvitationStatus.ACCEPTED,
          acceptedById: userId,
          acceptedAt: now,
        },
      });

      if (claimed.count !== 1) {
        const fresh = await tx.tableInvitation.findUnique({ where: { id: invitation.id } });
        const active = await tx.tableMember.findFirst({
          where: { tableId: invitation.tableId, userId, status: TableMemberStatus.ACTIVE },
        });
        if (fresh?.status === TableInvitationStatus.ACCEPTED && fresh.acceptedById === userId && active) {
          return { invitation: fresh, membership: active };
        }

        throw new AppError(409, "Convite nao esta pendente.", "TABLE_INVITATION_NOT_PENDING");
      }

      let membership;
      try {
        membership = await tx.tableMember.create({
          data: {
            tableId: invitation.tableId,
            userId,
            role: invitation.intendedRole,
            status: TableMemberStatus.ACTIVE,
          },
        });
      } catch (error) {
        if (this.isUniqueConflict(error)) {
          membership = await tx.tableMember.findFirst({
            where: { tableId: invitation.tableId, userId, status: TableMemberStatus.ACTIVE },
          });
          if (!membership) {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const accepted = await tx.tableInvitation.findUnique({ where: { id: invitation.id } });
      return { invitation: accepted ?? invitation, membership };
    });

    return {
      invitation: this.formatInvitation(result.invitation),
      membership: result.membership,
    };
  }

  static async getPlayerContext(userId: string, tableId: string) {
    await TableAuthorizationService.requireTablePlayerOrMaster(tableId, userId);
    return this.getTableScopedContext(tableId, [
      ContextVisibility.PUBLIC,
      ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
    ]);
  }

  static async getMasterContext(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    return this.getTableScopedContext(tableId, [
      ContextVisibility.PUBLIC,
      ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
      ContextVisibility.TABLE_MASTER,
    ]);
  }

  private static async getTableScopedContext(tableId: string, visibilities: ContextVisibility[]) {
    const table = await this.db.table.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        settingId: true,
        episodeId: true,
        contextVersionId: true,
        contextVersion: {
          include: {
            setting: true,
            episode: true,
            units: {
              where: {
                visibility: { in: visibilities },
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    if (
      !table ||
      table.contextVersion.status !== ContextVersionStatus.PUBLISHED ||
      table.contextVersion.settingId !== table.settingId ||
      table.contextVersion.episodeId !== table.episodeId
    ) {
      throw new AppError(404, "Contexto da mesa nao encontrado.", "TABLE_CONTEXT_NOT_FOUND");
    }

    return {
      id: table.contextVersion.id,
      tableId: table.id,
      version: table.contextVersion.version,
      layer: table.contextVersion.layer,
      status: table.contextVersion.status,
      setting: {
        id: table.contextVersion.setting.id,
        stableKey: table.contextVersion.setting.stableKey,
        title: table.contextVersion.setting.title,
      },
      episode: table.contextVersion.episode
        ? {
            id: table.contextVersion.episode.id,
            stableKey: table.contextVersion.episode.stableKey,
            title: table.contextVersion.episode.title,
          }
        : null,
      units: table.contextVersion.units.map((unit) => ({
        id: unit.id,
        classification: unit.classification,
        visibility: unit.visibility,
        title: unit.title,
        content: unit.content,
        sortOrder: unit.sortOrder,
      })),
    };
  }

  private static async ensureVerifiedUser(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      throw new AppError(401, "Usuario autenticado nao encontrado.", "AUTH_REQUIRED");
    }
    if (!user.emailVerifiedAt) {
      throw new AppError(403, "Confirme seu e-mail antes de continuar.", "EMAIL_NOT_VERIFIED");
    }

    return user;
  }

  private static async ensurePublishedContextSelection(settingId: string, episodeId: string, contextVersionId: string) {
    const setting = await this.db.setting.findUnique({ where: { id: settingId }, select: { id: true } });
    if (!setting) {
      throw new AppError(404, "Setting nao encontrado.", "SETTING_NOT_FOUND");
    }

    const episode = await this.db.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new AppError(404, "Episodio nao encontrado.", "EPISODE_NOT_FOUND");
    }
    if (episode.settingId !== settingId) {
      throw new AppError(400, "Episodio nao pertence ao Setting informado.", "INVALID_SETTING_EPISODE_RELATIONSHIP");
    }

    const contextVersion = await this.db.contextVersion.findUnique({ where: { id: contextVersionId } });
    if (
      !contextVersion ||
      contextVersion.settingId !== settingId ||
      contextVersion.episodeId !== episodeId ||
      contextVersion.layer !== ContextLayer.EPISODE
    ) {
      throw new AppError(400, "Versao de contexto nao pertence ao Setting/Episodio selecionado.", "INVALID_TABLE_CONTEXT_VERSION");
    }
    if (contextVersion.status !== ContextVersionStatus.PUBLISHED) {
      throw new AppError(409, "A mesa exige Context publicado.", "TABLE_CONTEXT_NOT_PUBLISHED");
    }

    return contextVersion;
  }

  private static async generateUniqueJoinCode(): Promise<string> {
    let code = "";
    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      code += JOIN_CODE_ALPHABET[crypto.randomInt(0, JOIN_CODE_ALPHABET.length)];
    }

    return code;
  }

  private static isUniqueConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private static formatTable(table: Prisma.TableGetPayload<{ select: typeof tableSelect }>, userId: string) {
    const membership = table.members.find((member) => member.userId === userId);
    const isMaster = membership?.role === TableMemberRole.MASTER;

    return {
      id: table.id,
      name: table.name,
      description: table.description,
      status: table.status,
      masterId: table.masterId,
      setting: table.setting,
      episode: table.episode,
      contextVersion: table.contextVersion,
      contextVersionId: table.contextVersionId,
      currentUserRole: membership?.role ?? null,
      memberStatus: membership?.status ?? null,
      isMaster,
      membersCount: table.members.length,
      maxPlayers: table.maxPlayers,
      ...(isMaster ? { joinCode: table.joinCode } : {}),
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };
  }

  private static formatInvitation(invitation: {
    id: string;
    tableId: string;
    invitedEmail: string;
    intendedRole: TableMemberRole;
    expiresAt: Date;
    status: TableInvitationStatus;
    invitedById: string;
    acceptedById: string | null;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: invitation.id,
      tableId: invitation.tableId,
      invitedEmail: invitation.invitedEmail,
      intendedRole: invitation.intendedRole,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      invitedById: invitation.invitedById,
      acceptedById: invitation.acceptedById,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
    };
  }
}
