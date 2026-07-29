import crypto from "crypto";
import defaultPrisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { getEmailSender } from "./email.sender";

const TOKEN_BYTES = 32;
const RESEND_SUCCESS_MESSAGE =
  "Se existir uma conta pendente para este e-mail, enviaremos uma nova confirmacao.";

export class EmailVerificationService {
  private static db: typeof defaultPrisma = defaultPrisma;

  static setDbForTests(db: typeof defaultPrisma): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static generateToken(): string {
    return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  }

  static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token, "utf8").digest("hex");
  }

  static buildConfirmationUrl(token: string): string {
    const baseUrl = env.APP_WEB_URL.replace(/\/+$/, "");
    return `${baseUrl}/confirmar-email?token=${encodeURIComponent(token)}`;
  }

  static async createAndSend(user: { id: string; email: string; nome: string }) {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60_000);

    await this.db.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    await getEmailSender().sendEmailVerification({
      to: user.email,
      nome: user.nome,
      confirmationUrl: this.buildConfirmationUrl(token),
      expiresAt,
    });

    return { expiresAt };
  }

  static async confirm(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const record = await this.db.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new AppError(
        400,
        "Token de confirmacao invalido.",
        "EMAIL_VERIFICATION_TOKEN_INVALID"
      );
    }

    if (record.consumedAt) {
      throw new AppError(
        400,
        "Token de confirmacao ja utilizado.",
        "EMAIL_VERIFICATION_TOKEN_INVALID"
      );
    }

    if (record.expiresAt <= now) {
      throw new AppError(
        400,
        "Token de confirmacao expirado.",
        "EMAIL_VERIFICATION_TOKEN_EXPIRED"
      );
    }

    if (record.user.emailVerifiedAt) {
      await this.db.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
      throw new AppError(409, "E-mail ja confirmado.", "EMAIL_ALREADY_VERIFIED");
    }

    const consumed = await this.db.$transaction(async (tx) => {
      const updateResult = await tx.emailVerificationToken.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (updateResult.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: now },
      });

      return true;
    });

    if (!consumed) {
      throw new AppError(
        400,
        "Token de confirmacao invalido.",
        "EMAIL_VERIFICATION_TOKEN_INVALID"
      );
    }

    return { code: "EMAIL_VERIFIED" };
  }

  static async resend(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
      return { message: RESEND_SUCCESS_MESSAGE, emailSent: false };
    }

    const latestToken = await this.db.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (latestToken) {
      const cooldownUntil = new Date(
        latestToken.createdAt.getTime() +
          env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
      );

      if (cooldownUntil > new Date()) {
        throw new AppError(
          429,
          "Aguarde antes de solicitar uma nova confirmacao.",
          "EMAIL_VERIFICATION_RESEND_COOLDOWN"
        );
      }
    }

    try {
      await this.createAndSend(user);
      return { message: RESEND_SUCCESS_MESSAGE, emailSent: true };
    } catch (error) {
      console.error("Failed to send email verification", {
        userId: user.id,
        error: "send_failed",
      });
      return { message: RESEND_SUCCESS_MESSAGE, emailSent: false };
    }
  }
}
