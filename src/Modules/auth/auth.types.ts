export interface RegisterInput {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface ConfirmEmailInput {
  token: string;
}

export interface ResendEmailVerificationInput {
  email: string;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ConfirmPasswordResetInput {
  token: string;
  novaSenha: string;
}
