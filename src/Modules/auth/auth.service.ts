import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import UserModel from "../users/user.models";
import { LoginInput, RegisterInput } from "./auth.types";

export class AuthService {
  static async register(input: RegisterInput) {
    const userExists = await UserModel.findByEmail(input.email);
    if (userExists) {
      throw new AppError(409, "E-mail ja cadastrado.", "EMAIL_ALREADY_EXISTS");
    }

    const senhaHash = await bcrypt.hash(input.senha, 10);
    const user = await UserModel.createUser(input.nome, input.email, senhaHash);

    return {
      token: this.signToken(user.id, user.accountRole),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        accountRole: user.accountRole,
        theme: user.theme ?? null,
      },
    };
  }

  static async login(input: LoginInput) {
    const user = await UserModel.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, "Credenciais invalidas.", "INVALID_CREDENTIALS");
    }

    const senhaCorreta = await bcrypt.compare(input.senha, user.senha);
    if (!senhaCorreta) {
      throw new AppError(401, "Credenciais invalidas.", "INVALID_CREDENTIALS");
    }

    return {
      token: this.signToken(user.id, user.accountRole),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        accountRole: user.accountRole,
        theme: user.theme ?? null,
      },
    };
  }

  private static signToken(userId: string, accountRole: "USER" | "ADMIN"): string {
    return jwt.sign({ id: userId, accountRole }, env.JWT_SECRET, { expiresIn: "1h" });
  }
}
