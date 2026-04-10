export interface IUser {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role: "PLAYER" | "ADMIN";
}

export interface UpdateProfileInput {
  nome?: string;
  email?: string;
}
