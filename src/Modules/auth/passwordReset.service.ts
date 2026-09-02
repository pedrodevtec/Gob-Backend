import bcrypt from "bcryptjs";
import { AuthSessionRevokeReason } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import defaultPrisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { getEmailSender } from "./email.sender";

const TOKEN_BYTES = 32;
const REQUEST_SUCCESS_MESSAGE =
  "Se existir uma conta para este e-mail, enviaremos instrucoes para redefinir a senha.";

export class PasswordResetService {
  private static db: typeof defaultPrisma = defaultPrisma;
  private static now: () => Date = () => new Date();

  static setDbForTests(db: typeof defaultPrisma): void {
    this.db = db;
  }

  static setClockForTests(clock: () => Date): void {
    this.now = clock;
  }

  static resetForTests(): void {
    this.db = defaultPrisma;
    this.now = () => new Date();
  }

  static generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  static hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  static buildResetUrl(token: string): string {
    const baseUrl = env.APP_WEB_URL.replace(/\/+$/, "");
    return `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  }

  static async request(email: string): Promise<{ message: string }> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      return { message: REQUEST_SUCCESS_MESSAGE };
    }

    const now = this.now();
    const latestToken = await this.db.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (
      latestToken &&
      latestToken.createdAt.getTime() +
        env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1_000 >
        now.getTime()
    ) {
      return { message: REQUEST_SUCCESS_MESSAGE };
    }

    const token = this.generateToken();
    const expiresAt = new Date(
      now.getTime() + env.PASSWORD_RESET_TTL_MINUTES * 60_000
    );

    await this.db.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt,
        },
      });
    });

    try {
      await getEmailSender().sendPasswordReset({
        to: user.email,
        nome: user.nome,
        resetUrl: this.buildResetUrl(token),
        expiresAt,
      });
    } catch {
      console.error("Failed to send password reset", {
        userId: user.id,
        error: "send_failed",
      });
    }

    return { message: REQUEST_SUCCESS_MESSAGE };
  }

  static async confirm(token: string, novaSenha: string) {
    const tokenHash = this.hashToken(token);
    const now = this.now();
    const record = await this.db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.consumedAt) {
      throw new AppError(
        400,
        "Link de redefinicao invalido ou ja utilizado.",
        "PASSWORD_RESET_TOKEN_INVALID"
      );
    }
    if (record.expiresAt <= now) {
      throw new AppError(
        400,
        "Link de redefinicao expirado.",
        "PASSWORD_RESET_TOKEN_EXPIRED"
      );
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const changed = await this.db.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;

      await tx.user.update({
        where: { id: record.userId },
        data: { senha: senhaHash },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.authSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: {
          revokedAt: now,
          revokeReason: AuthSessionRevokeReason.PASSWORD_CHANGED,
        },
      });
      return true;
    });

    if (!changed) {
      throw new AppError(
        400,
        "Link de redefinicao invalido ou ja utilizado.",
        "PASSWORD_RESET_TOKEN_INVALID"
      );
    }

    return { code: "PASSWORD_RESET_COMPLETED" };
  }
}
