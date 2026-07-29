import { Request } from "express";
import { getBody, requireEmail, requireString } from "../../utils/validation";
import {
  ConfirmEmailInput,
  LoginInput,
  RegisterInput,
  ResendEmailVerificationInput,
} from "./auth.types";

export const validateRegister = (req: Request): void => {
  const body = getBody(req);
  const parsed: RegisterInput = {
    nome: requireString(body.nome, "nome", 2, 80),
    email: requireEmail(body.email, "email"),
    senha: requireString(body.senha, "senha", 6, 120),
  };

  req.body = parsed;
};

export const validateLogin = (req: Request): void => {
  const body = getBody(req);
  const parsed: LoginInput = {
    email: requireEmail(body.email, "email"),
    senha: requireString(body.senha, "senha", 6, 120),
  };

  req.body = parsed;
};

export const validateConfirmEmail = (req: Request): void => {
  const body = getBody(req);
  const parsed: ConfirmEmailInput = {
    token: requireString(body.token, "token", 20, 500),
  };

  req.body = parsed;
};

export const validateResendEmailVerification = (req: Request): void => {
  const body = getBody(req);
  const parsed: ResendEmailVerificationInput = {
    email: requireEmail(body.email, "email"),
  };

  req.body = parsed;
};
