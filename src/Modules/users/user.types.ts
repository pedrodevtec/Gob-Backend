export interface IUser {
  id: string;
  nome: string;
  email: string;
  senha: string;
  accountRole: "USER" | "ADMIN";
  theme?: string | null;
}

export interface UpdateProfileInput {
  nome?: string;
  email?: string;
  theme?: string;
}
