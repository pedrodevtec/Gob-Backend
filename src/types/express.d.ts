import { AuthTokenPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      requestId?: string;
    }
  }
}

export {};
