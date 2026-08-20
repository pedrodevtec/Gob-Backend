import { Request } from "express";
import { GuardianAvatarKey } from "@prisma/client";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requireEmail } from "../../utils/validation";
import { UpdateProfileInput } from "./user.types";

const allowedThemes = new Set(["default", "ocean", "ember", "verdant"]);
const allowedGuardianAvatars = new Set<GuardianAvatarKey>([
  GuardianAvatarKey.guardian_sword,
  GuardianAvatarKey.guardian_fist,
  GuardianAvatarKey.guardian_explorer,
]);

export const validateUpdateProfile = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateProfileInput = {
    nome: optionalString(body.nome, "nome", 2, 80),
    email: body.email === undefined ? undefined : requireEmail(body.email, "email"),
    theme: optionalString(body.theme, "theme", 3, 40),
    selectedGuardianAvatar: optionalString(
      body.selectedGuardianAvatar,
      "selectedGuardianAvatar",
      12,
      40
    ) as GuardianAvatarKey | undefined,
  };

  if (parsed.theme && !allowedThemes.has(parsed.theme)) {
    throw new AppError(400, "Tema informado invalido.", "VALIDATION_ERROR");
  }

  if (
    parsed.selectedGuardianAvatar &&
    !allowedGuardianAvatars.has(parsed.selectedGuardianAvatar)
  ) {
    throw new AppError(400, "Guardiao informado invalido.", "VALIDATION_ERROR");
  }

  if (!parsed.nome && !parsed.email && !parsed.theme && !parsed.selectedGuardianAvatar) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizacao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};
