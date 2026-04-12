export interface IUser {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role: "PLAYER" | "ADMIN";
  theme?: string | null;
}

export interface UpdateProfileInput {
  nome?: string;
  email?: string;
  theme?: string;
}
