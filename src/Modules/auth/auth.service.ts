import bcrypt from "bcryptjs";
import { AppError } from "../../errors/AppError";
import UserModel from "../users/user.models";
import { EmailVerificationService } from "./emailVerification.service";
import {
  ConfirmEmailInput,
  LoginInput,
  RegisterInput,
  ResendEmailVerificationInput,
} from "./auth.types";
import { AuthSessionService } from "./authSession.service";

export class AuthService {
  static async register(input: RegisterInput) {
    const userExists = await UserModel.findByEmail(input.email);
    if (userExists) {
      throw new AppError(409, "E-mail ja cadastrado.", "EMAIL_ALREADY_EXISTS");
    }

    const senhaHash = await bcrypt.hash(input.senha, 10);
    const user = await UserModel.createUser(input.nome, input.email, senhaHash);
    let emailDelivery: "SENT" | "FAILED" = "SENT";

    try {
      await EmailVerificationService.createAndSend(user);
    } catch (error) {
      emailDelivery = "FAILED";
      console.error("Failed to send email verification", {
        userId: user.id,
        error: "send_failed",
      });
    }

    return {
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        accountRole: user.accountRole,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        theme: user.theme ?? null,
      },
      emailVerificationRequired: true,
      emailDelivery,
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

    if (!user.emailVerifiedAt) {
      throw new AppError(403, "Confirme seu e-mail antes de entrar.", "EMAIL_NOT_VERIFIED");
    }

    return AuthSessionService.createSession({
      id: user.id,
      nome: user.nome,
      email: user.email,
      accountRole: user.accountRole,
      emailVerifiedAt: user.emailVerifiedAt,
      theme: user.theme ?? null,
    });
  }

  static async confirmEmail(input: ConfirmEmailInput) {
    return EmailVerificationService.confirm(input.token);
  }

  static async resendEmailVerification(input: ResendEmailVerificationInput) {
    return EmailVerificationService.resend(input.email);
  }
}
