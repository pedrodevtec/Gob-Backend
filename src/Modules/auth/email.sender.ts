import { env } from "../../config/env";

export interface SendEmailVerificationInput {
  to: string;
  nome: string;
  confirmationUrl: string;
  expiresAt: Date;
}

export interface EmailSender {
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
}

export class ResendEmailSender implements EmailSender {
  async sendEmailVerification(input: SendEmailVerificationInput): Promise<void> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      if (env.NODE_ENV !== "production") {
        console.info("Email verification send skipped: email provider is not configured.");
        return;
      }

      throw new Error("Email provider is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: "Confirme seu e-mail - Guardian of Bravantus",
        html: buildVerificationHtml(input),
        text: buildVerificationText(input),
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected verification email with status ${response.status}.`);
    }
  }
}

const buildVerificationText = (input: SendEmailVerificationInput): string => {
  return [
    `Ola, ${input.nome}.`,
    "",
    "Uma conta foi criada no Guardian of Bravantus com este e-mail.",
    `Confirme seu e-mail acessando o link abaixo ate ${input.expiresAt.toISOString()}:`,
    input.confirmationUrl,
    "",
    "Se voce nao realizou este cadastro, ignore esta mensagem.",
  ].join("\n");
};

const buildVerificationHtml = (input: SendEmailVerificationInput): string => {
  return [
    `<p>Ola, ${escapeHtml(input.nome)}.</p>`,
    "<p>Uma conta foi criada no Guardian of Bravantus com este e-mail.</p>",
    `<p>Confirme seu e-mail ate ${input.expiresAt.toISOString()}:</p>`,
    `<p><a href="${escapeHtml(input.confirmationUrl)}">Confirmar e-mail</a></p>`,
    "<p>Se voce nao realizou este cadastro, ignore esta mensagem.</p>",
  ].join("");
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

let emailSender: EmailSender = new ResendEmailSender();

export const getEmailSender = (): EmailSender => emailSender;

export const setEmailSenderForTests = (sender: EmailSender): void => {
  emailSender = sender;
};

export const resetEmailSenderForTests = (): void => {
  emailSender = new ResendEmailSender();
};
