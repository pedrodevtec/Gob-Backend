import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requireEmail } from "../../utils/validation";
import { UpdateProfileInput } from "./user.types";

export const validateUpdateProfile = (req: Request): void => {
  const body = getBody(req);
  const parsed: UpdateProfileInput = {
    nome: optionalString(body.nome, "nome", 2, 80),
    email: body.email === undefined ? undefined : requireEmail(body.email, "email"),
  };

  if (!parsed.nome && !parsed.email) {
    throw new AppError(400, "Nenhum campo valido enviado para atualizacao.", "VALIDATION_ERROR");
  }

  req.body = parsed;
};
