import { Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireUserId } from "../../utils/validation";
import UserModel from "./user.models";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const user = await UserModel.findPublicById(userId);
  sendSuccess(res, 200, { user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);

  if (req.body.email) {
    const existing = await UserModel.findByEmail(req.body.email);
    if (existing && existing.id !== userId) {
      throw new AppError(409, "E-mail ja cadastrado.", "EMAIL_ALREADY_EXISTS");
    }
  }

  const user = await UserModel.updateProfile(userId, req.body);
  sendSuccess(res, 200, { user }, "Perfil atualizado com sucesso.");
});
