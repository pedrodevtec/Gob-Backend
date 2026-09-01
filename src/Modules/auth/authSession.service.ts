import { AuthSessionRevokeReason } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import defaultPrisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";

const ACCESS_TOKEN_TTL_SECONDS = 600;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const ROTATION_CONFLICT_WINDOW_MS = 5_000;
const ACCESS_TOKEN_ISSUER = "gob-backend";
const ACCESS_TOKEN_AUDIENCE = "gob-frontend";

type SessionUser = {
  id: string;
  nome: string;
  email: string;
  accountRole: "USER" | "ADMIN";
  emailVerifiedAt: Date | null;
  theme: string | null;
};

type AuthSessionDb = Pick<
  typeof defaultPrisma,
  "$transaction" | "authSession" | "authRefreshToken"
>;

const publicUser = (user: SessionUser) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  accountRole: user.accountRole,
  emailVerifiedAt: user.emailVerifiedAt,
  theme: user.theme,
});

export type VerifiedAccessToken = {
  sub: string;
  sid: string;
  accountRole: "USER" | "ADMIN";
  exp: number;
  jti: string;
};

export class AuthSessionService {
  private static db: AuthSessionDb = defaultPrisma;
  private static now: () => Date = () => new Date();

  static setDbForTests(db: AuthSessionDb): void {
    this.db = db;
  }

  static setClockForTests(clock: () => Date): void {
    this.now = clock;
  }

  static resetForTests(): void {
    this.db = defaultPrisma;
    this.now = () => new Date();
  }

  static hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  static async createSession(user: SessionUser) {
    const now = this.now();
    const refreshToken = randomBytes(48).toString("base64url");
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000);
    const sessionId = randomUUID();
    const familyId = randomUUID();

    const session = await this.db.authSession.create({
      data: {
        id: sessionId,
        familyId,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
        refreshTokens: {
          create: {
            tokenHash: this.hashRefreshToken(refreshToken),
            expiresAt: refreshTokenExpiresAt,
          },
        },
      },
      select: { id: true, expiresAt: true },
    });

    return this.buildTokenResponse(user, session, refreshToken, refreshTokenExpiresAt, now);
  }

  static async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const successorSecret = randomBytes(48).toString("base64url");
    const successorHash = this.hashRefreshToken(successorSecret);
    const successorId = randomUUID();
    const now = this.now();
    const successorExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000);

    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AuthRefreshToken" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const initialToken = await tx.authRefreshToken.findUnique({
        where: { tokenHash },
        select: { sessionId: true },
      });
      if (!initialToken) {
        throw new AppError(401, "Refresh token invalido.", "INVALID_REFRESH_TOKEN");
      }

      await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE id = ${initialToken.sessionId} FOR UPDATE`;
      const token = await tx.authRefreshToken.findUnique({
        where: { tokenHash },
        include: { session: { include: { user: true } } },
      });
      if (!token) {
        throw new AppError(401, "Refresh token invalido.", "INVALID_REFRESH_TOKEN");
      }

      const session = token.session;
      if (session.revokedAt) {
        throw new AppError(401, "Sessao revogada.", "SESSION_REVOKED");
      }
      if (session.expiresAt <= now || token.expiresAt <= now) {
        await tx.authSession.update({
          where: { id: session.id },
          data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.SESSION_EXPIRED },
        });
        return { error: new AppError(401, "Sessao expirada.", "SESSION_EXPIRED") };
      }
      if (token.consumedAt) {
        const elapsed = now.getTime() - token.consumedAt.getTime();
        if (elapsed < ROTATION_CONFLICT_WINDOW_MS) {
          throw new AppError(409, "Refresh token ja rotacionado.", "REFRESH_ALREADY_ROTATED");
        }
        await tx.authSession.update({
          where: { id: session.id },
          data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.REFRESH_TOKEN_REUSED },
        });
        return {
          error: new AppError(
            401,
            "Reutilizacao de refresh token detectada.",
            "REFRESH_TOKEN_REUSED"
          ),
        };
      }

      await tx.authRefreshToken.create({
        data: {
          id: successorId,
          sessionId: session.id,
          tokenHash: successorHash,
          expiresAt: successorExpiresAt,
        },
      });
      await tx.authRefreshToken.update({
        where: { id: token.id },
        data: { consumedAt: now, replacedByTokenId: successorId },
      });
      const updatedSession = await tx.authSession.update({
        where: { id: session.id },
        data: { expiresAt: successorExpiresAt, lastUsedAt: now },
        select: { id: true, expiresAt: true },
      });

      return { user: session.user, session: updatedSession };
    });

    if ("error" in result) {
      throw result.error;
    }

    return this.buildTokenResponse(
      result.user,
      result.session,
      successorSecret,
      successorExpiresAt,
      now
    );
  }

  static async logout(rawRefreshToken: string): Promise<{ success: true; outcome: "revoked" | "already_inactive" }> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const now = this.now();

    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AuthRefreshToken" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const token = await tx.authRefreshToken.findUnique({
        where: { tokenHash },
        select: { sessionId: true },
      });
      if (!token) {
        return { success: true, outcome: "already_inactive" as const };
      }

      await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE id = ${token.sessionId} FOR UPDATE`;
      const session = await tx.authSession.findUnique({
        where: { id: token.sessionId },
        select: { id: true, revokedAt: true, expiresAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt <= now) {
        if (session && !session.revokedAt) {
          await tx.authSession.update({
            where: { id: session.id },
            data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.SESSION_EXPIRED },
          });
        }
        return { success: true, outcome: "already_inactive" as const };
      }

      await tx.authSession.update({
        where: { id: session.id },
        data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.LOGOUT },
      });
      return { success: true, outcome: "revoked" as const };
    });
  }

  static verifyAccessToken(token: string): VerifiedAccessToken {
    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(401, "Access token expirado.", "TOKEN_EXPIRED");
      }
      throw new AppError(401, "Access token invalido.", "INVALID_TOKEN");
    }

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.sid !== "string" ||
      (decoded.accountRole !== "USER" && decoded.accountRole !== "ADMIN") ||
      typeof decoded.exp !== "number" ||
      typeof decoded.jti !== "string"
    ) {
      throw new AppError(401, "Access token invalido.", "INVALID_TOKEN");
    }

    return {
      sub: decoded.sub,
      sid: decoded.sid,
      accountRole: decoded.accountRole,
      exp: decoded.exp,
      jti: decoded.jti,
    };
  }

  static async validateActiveSession(claims: VerifiedAccessToken) {
    const now = this.now();
    const session = await this.db.authSession.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    });
    if (!session || session.userId !== claims.sub || session.revokedAt) {
      throw new AppError(401, "Sessao revogada.", "SESSION_REVOKED");
    }
    if (session.expiresAt <= now) {
      await this.db.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.SESSION_EXPIRED },
      });
      throw new AppError(401, "Sessao expirada.", "SESSION_EXPIRED");
    }
    if (session.user.accountRole !== claims.accountRole) {
      await this.db.authSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: now, revokeReason: AuthSessionRevokeReason.ACCOUNT_ROLE_CHANGED },
      });
      throw new AppError(401, "Sessao revogada apos alteracao de papel.", "SESSION_REVOKED");
    }
    if (!session.user.emailVerifiedAt) {
      throw new AppError(403, "Confirme seu e-mail antes de continuar.", "EMAIL_NOT_VERIFIED");
    }

    return {
      user: publicUser(session.user),
      session: { id: session.id, expiresAt: session.expiresAt },
    };
  }

  private static buildTokenResponse(
    user: SessionUser,
    session: { id: string; expiresAt: Date },
    refreshToken: string,
    refreshTokenExpiresAt: Date,
    issuedAt: Date
  ) {
    const accessToken = jwt.sign(
      { sid: session.id, accountRole: user.accountRole },
      env.JWT_SECRET,
      {
        algorithm: "HS256",
        subject: user.id,
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
        jwtid: randomUUID(),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      }
    );
    const decoded = jwt.decode(accessToken) as JwtPayload;

    return {
      accessToken,
      accessTokenExpiresAt: new Date((decoded.exp ?? Math.floor(issuedAt.getTime() / 1_000) + ACCESS_TOKEN_TTL_SECONDS) * 1_000),
      refreshToken,
      refreshTokenExpiresAt,
      session: { id: session.id, expiresAt: session.expiresAt },
      user: publicUser(user),
    };
  }
}
