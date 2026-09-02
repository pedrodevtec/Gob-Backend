import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, requireEmail, requireString } from "../../utils/validation";
import {
  ConfirmEmailInput,
  ConfirmPasswordResetInput,
  LoginInput,
  RefreshInput,
  RequestPasswordResetInput,
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

export const validateRefreshToken = (req: Request): void => {
  const body = getBody(req);
  if (body.refreshToken === undefined || body.refreshToken === null || body.refreshToken === "") {
    throw new AppError(
      401,
      "Refresh token obrigatorio.",
      "REFRESH_REQUIRED"
    );
  }
  const parsed: RefreshInput = {
    refreshToken: requireString(body.refreshToken, "refreshToken", 32, 512),
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

export const validateRequestPasswordReset = (req: Request): void => {
  const body = getBody(req);
  req.body = { email: requireEmail(body.email, "email") } satisfies RequestPasswordResetInput;
};

export const validateConfirmPasswordReset = (req: Request): void => {
  const body = getBody(req);
  req.body = {
    token: requireString(body.token, "token", 20, 500),
    novaSenha: requireString(body.novaSenha, "novaSenha", 6, 120),
  } satisfies ConfirmPasswordResetInput;
};
