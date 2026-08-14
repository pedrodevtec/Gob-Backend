import { env } from "../../config/env";

export type PlaytestNotificationKind =
  | "CHARACTER_SUBMITTED"
  | "CHARACTER_CHANGES_REQUESTED"
  | "CHARACTER_APPROVED";

export interface PlaytestNotificationInput {
  kind: PlaytestNotificationKind;
  to: string;
  playerName: string;
  characterName: string;
  campaignTitle?: string;
  actionUrl: string;
  masterFeedback?: string | null;
}

export interface PlaytestNotificationSender {
  send(input: PlaytestNotificationInput): Promise<void>;
}

type NotificationContent = {
  subject: string;
  eyebrow: string;
  title: string;
  message: string;
  actionLabel: string;
};

export class ResendPlaytestNotificationSender implements PlaytestNotificationSender {
  async send(input: PlaytestNotificationInput): Promise<void> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      if (env.NODE_ENV !== "production") {
        console.info("Playtest notification skipped: email provider is not configured.", {
          kind: input.kind,
        });
        return;
      }

      throw new Error("Email provider is not configured.");
    }

    const content = buildNotificationContent(input);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: content.subject,
        html: buildNotificationHtml(input, content),
        text: buildNotificationText(input, content),
      }),
    });

    if (!response.ok) {
      throw new Error(`Email provider rejected playtest notification with status ${response.status}.`);
    }
  }
}

export const buildNotificationContent = (
  input: PlaytestNotificationInput
): NotificationContent => {
  if (input.kind === "CHARACTER_CHANGES_REQUESTED") {
    return {
      subject: `O Mestre deixou um retorno para ${input.characterName}`,
      eyebrow: "Retorno do Mestre",
      title: `${input.characterName} precisa de alguns ajustes`,
      message:
        "Sua história continua guardada. Leia o retorno do Mestre, ajuste apenas o que for necessário e envie a ficha novamente.",
      actionLabel: "Ver ajustes do Mestre",
    };
  }

  if (input.kind === "CHARACTER_APPROVED") {
    return {
      subject: `Personagem aprovado: ${input.characterName}`,
      eyebrow: "Personagem aprovado",
      title: `O Mestre aprovou ${input.characterName}`,
      message:
        "O Mestre aprovou seu personagem. Volte à plataforma para consultar a ficha, baixar uma cópia e acompanhar a conclusão do playtest.",
      actionLabel: "Ver meu personagem",
    };
  }

  return {
    subject: `Recebemos a ficha de ${input.characterName}`,
    eyebrow: "Ficha recebida",
    title: "Sua criação chegou ao Mestre",
    message:
      "A ficha foi enviada com sucesso. Enquanto o Mestre faz a leitura, você já pode responder à pesquisa e acompanhar sua jornada pela plataforma.",
    actionLabel: "Acompanhar minha jornada",
  };
};

export const buildNotificationText = (
  input: PlaytestNotificationInput,
  content = buildNotificationContent(input)
): string => {
  const lines = [
    `Olá, ${input.playerName}.`,
    "",
    content.title,
    content.message,
  ];

  if (input.kind === "CHARACTER_CHANGES_REQUESTED" && input.masterFeedback) {
    lines.push("", "Retorno do Mestre:", input.masterFeedback);
  }

  lines.push("", `${content.actionLabel}:`, input.actionUrl, "", "Guardian of Bravantus");
  return lines.join("\n");
};

export const buildNotificationHtml = (
  input: PlaytestNotificationInput,
  content = buildNotificationContent(input)
): string => {
  const feedback =
    input.kind === "CHARACTER_CHANGES_REQUESTED" && input.masterFeedback
      ? `<div style="margin:24px 0;padding:16px;border-left:3px solid #c89b3c;background:#17140f;color:#f3ead6;border-radius:8px"><strong style="display:block;margin-bottom:8px;color:#e6b84f">Retorno do Mestre</strong>${escapeHtml(input.masterFeedback)}</div>`
      : "";
  const campaign = input.campaignTitle
    ? `<p style="margin:0 0 8px;color:#9aa3af;font-size:13px">${escapeHtml(input.campaignTitle)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#050912;color:#f8fafc;font-family:Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(content.message)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050912;padding:28px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #243244;border-radius:16px;background:#090f1c;overflow:hidden">
          <tr><td style="padding:28px">
            ${campaign}
            <p style="margin:0 0 12px;color:#e6b84f;font-size:12px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase">${escapeHtml(content.eyebrow)}</p>
            <h1 style="margin:0 0 16px;color:#ffffff;font-size:26px;line-height:1.25">${escapeHtml(content.title)}</h1>
            <p style="margin:0 0 12px;color:#d1d5db;font-size:16px;line-height:1.65">Olá, ${escapeHtml(input.playerName)}.</p>
            <p style="margin:0;color:#d1d5db;font-size:16px;line-height:1.65">${escapeHtml(content.message)}</p>
            ${feedback}
            <p style="margin:28px 0 12px"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#e6b84f;color:#111827;text-decoration:none;font-weight:bold">${escapeHtml(content.actionLabel)}</a></p>
            <p style="margin:22px 0 0;color:#7f8a9a;font-size:12px;line-height:1.5">Esta é uma mensagem sobre sua participação no playtest de Guardian of Bravantus.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

let notificationSender: PlaytestNotificationSender =
  new ResendPlaytestNotificationSender();

export const getPlaytestNotificationSender = (): PlaytestNotificationSender =>
  notificationSender;

export const setPlaytestNotificationSenderForTests = (
  sender: PlaytestNotificationSender
): void => {
  notificationSender = sender;
};

export const resetPlaytestNotificationSenderForTests = (): void => {
  notificationSender = new ResendPlaytestNotificationSender();
};

export const sendPlaytestNotificationSafely = async (
  input: PlaytestNotificationInput
): Promise<void> => {
  try {
    await notificationSender.send(input);
  } catch (error) {
    console.error("Failed to send playtest notification.", {
      kind: input.kind,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
};
