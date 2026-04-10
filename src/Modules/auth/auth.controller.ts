import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireUserId } from "../../utils/validation";
import UserModel from "../users/user.models";
import { AuthService } from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  sendSuccess(res, 201, result, "Usuario cadastrado com sucesso.");
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  sendSuccess(res, 200, result, "Login realizado com sucesso.");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await UserModel.findPublicById(userId);
  sendSuccess(res, 200, { user });
});
