import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireUserId } from "../../utils/validation";
import UserModel from "../users/user.models";
import { AuthService } from "./auth.service";
import { AuthSessionService } from "./authSession.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  sendSuccess(res, 201, result, "Usuario cadastrado com sucesso.");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  res.status(200).json({ success: true, ...result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthSessionService.refresh(req.body.refreshToken);
  res.status(200).json({ success: true, ...result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthSessionService.logout(req.body.refreshToken);
  res.status(200).json(result);
});

export const confirmEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.confirmEmail(req.body);
  sendSuccess(res, 200, result);
});

export const resendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.resendEmailVerification(req.body);
  sendSuccess(res, 200, { message: result.message });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.requestPasswordReset(req.body);
  sendSuccess(res, 200, { message: result.message });
});

export const confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.confirmPasswordReset(req.body);
  sendSuccess(res, 200, result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await UserModel.findPublicById(userId);
  const sessionUser = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    accountRole: user.accountRole,
    emailVerifiedAt: user.emailVerifiedAt,
    theme: user.theme,
  };
  if (!req.user?.sessionId || !req.user.sessionExpiresAt) {
    // Development-only compatibility for legacy local tokens. Production auth
    // rejects tokens without sid before reaching this controller.
    sendSuccess(res, 200, { user: sessionUser });
    return;
  }
  sendSuccess(res, 200, {
    user: sessionUser,
    session: { id: req.user.sessionId, expiresAt: req.user.sessionExpiresAt },
  });
});
