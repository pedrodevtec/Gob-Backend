export interface AuthTokenPayload {
  id: string;
  accountRole: "USER" | "ADMIN";
  sessionId?: string;
  sessionExpiresAt?: Date;
}
