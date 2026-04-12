import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { IUser, UpdateProfileInput } from "./user.types";

export default class UserModel {
  static async createUser(nome: string, email: string, senhaHash: string): Promise<IUser> {
    return prisma.user.create({
      data: { nome, email, senha: senhaHash },
    });
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findPublicById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        theme: true,
      },
    });

    if (!user) {
      throw new AppError(404, "Usuario nao encontrado.", "USER_NOT_FOUND");
    }

    return user;
  }

  static async updateProfile(id: string, input: UpdateProfileInput) {
    return prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        theme: true,
      },
    });
  }
}
