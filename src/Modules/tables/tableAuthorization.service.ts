import { TableMemberRole, TableMemberStatus } from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";

type TableAuthDb = Pick<typeof defaultPrisma, "table" | "tableMember">;

export class TableAuthorizationService {
  private static db: TableAuthDb = defaultPrisma;

  static setDbForTests(db: TableAuthDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async requireTableMember(tableId: string, userId: string) {
    const membership = await this.db.tableMember.findFirst({
      where: {
        tableId,
        userId,
        status: TableMemberStatus.ACTIVE,
      },
      select: {
        id: true,
        tableId: true,
        userId: true,
        role: true,
        status: true,
      },
    });

    if (!membership) {
      const tableExists = await this.db.table.findUnique({
        where: { id: tableId },
        select: { id: true },
      });
      if (!tableExists) {
        throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
      }

      throw new AppError(403, "Acesso restrito a membros ativos da mesa.", "TABLE_MEMBER_REQUIRED");
    }

    return membership;
  }

  static async requireTableMaster(tableId: string, userId: string) {
    const membership = await this.requireTableMember(tableId, userId);
    if (membership.role !== TableMemberRole.MASTER) {
      throw new AppError(403, "Acesso restrito ao Mestre ativo da mesa.", "TABLE_MASTER_REQUIRED");
    }

    return membership;
  }

  static async requireTablePlayerOrMaster(tableId: string, userId: string) {
    const membership = await this.requireTableMember(tableId, userId);
    if (![TableMemberRole.PLAYER, TableMemberRole.MASTER].includes(membership.role)) {
      throw new AppError(403, "Papel de mesa nao autorizado.", "TABLE_ROLE_REQUIRED");
    }

    return membership;
  }
}
