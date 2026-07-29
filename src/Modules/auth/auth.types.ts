export interface RegisterInput {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}

export interface ConfirmEmailInput {
  token: string;
}

export interface ResendEmailVerificationInput {
  email: string;
}
