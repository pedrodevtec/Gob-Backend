import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requireEmail } from "../../utils/validation";
import { UpdateProfileInput } from "./user.types";

const allowedThemes = new Set(["default", "ocean", "ember", "verdant"]);

export const validateUpdateProfile = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateProfileInput = {
    nome: optionalString(body.nome, "nome", 2, 80),
    email: body.email === undefined ? undefined : requireEmail(body.email, "email"),
    theme: optionalString(body.theme, "theme", 3, 40),
  };

  if (parsed.theme && !allowedThemes.has(parsed.theme)) {
    throw new AppError(400, "Tema informado invalido.", "VALIDATION_ERROR");
  }

  if (!parsed.nome && !parsed.email && !parsed.theme) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizacao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};
