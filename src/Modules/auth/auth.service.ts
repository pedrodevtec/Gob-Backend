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
      token: this.signToken(user.id, user.role),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
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
      token: this.signToken(user.id, user.role),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    };
  }

  private static signToken(userId: string, role: "PLAYER" | "ADMIN"): string {
    return jwt.sign({ id: userId, role }, env.JWT_SECRET, { expiresIn: "1h" });
  }
}
