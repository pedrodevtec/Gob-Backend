import assert from "node:assert/strict";
import { env } from "../../../config/env";
import {
  buildNotificationHtml,
  buildNotificationText,
  PlaytestNotificationInput,
  ResendPlaytestNotificationSender,
  resetPlaytestNotificationSenderForTests,
  sendPlaytestNotificationSafely,
  setPlaytestNotificationSenderForTests,
} from "../playtestNotification.sender";

const baseInput: PlaytestNotificationInput = {
  kind: "CHARACTER_SUBMITTED",
  to: "jogador@example.test",
  playerName: "Ayla",
  characterName: "Ayla da Fronteira",
  campaignTitle: "Chamado aos Marcados",
  actionUrl: "https://bravantus.example/dashboard",
};

const test = async (name: string, run: () => Promise<void> | void) => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

(async () => {
  await test("monta mensagens diferentes para envio, ajuste e aprovacao", () => {
    const submitted = buildNotificationText(baseInput);
    const changes = buildNotificationText({
      ...baseInput,
      kind: "CHARACTER_CHANGES_REQUESTED",
      masterFeedback: "Explique melhor a promessa.",
    });
    const approved = buildNotificationText({
      ...baseInput,
      kind: "CHARACTER_APPROVED",
    });

    assert.match(submitted, /chegou ao Mestre/);
    assert.match(submitted, /responder à pesquisa/);
    assert.match(changes, /Explique melhor a promessa/);
    assert.match(approved, /Mestre aprovou/);
    assert.match(approved, /baixar uma cópia/);
  });

  await test("escapa retorno do Mestre no HTML", () => {
    const html = buildNotificationHtml({
      ...baseInput,
      kind: "CHARACTER_CHANGES_REQUESTED",
      masterFeedback: "Ajuste <script>alert('x')</script>",
    });
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Ver ajustes do Mestre/);
  });

  await test("envia pelo Resend sem expor a chave no corpo", async () => {
    const originalEnv = { ...env };
    const originalFetch = global.fetch;
    let requestBody = "";
    let authorization = "";
    Object.assign(env, {
      NODE_ENV: "test",
      RESEND_API_KEY: "resend-secret",
      EMAIL_FROM: "Bravantus <playtest@example.test>",
    });
    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      authorization = String((init?.headers as Record<string, string>)?.Authorization ?? "");
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    try {
      await new ResendPlaytestNotificationSender().send(baseInput);
      assert.match(requestBody, /Recebemos a ficha/);
      assert.match(requestBody, /jogador@example.test/);
      assert.equal(requestBody.includes("resend-secret"), false);
      assert.equal(authorization, "Bearer resend-secret");
    } finally {
      global.fetch = originalFetch;
      Object.assign(env, originalEnv);
    }
  });

  await test("falha do provedor nao desfaz a transicao do playtest", async () => {
    setPlaytestNotificationSenderForTests({
      async send() {
        throw new Error("provider unavailable");
      },
    });
    await assert.doesNotReject(() => sendPlaytestNotificationSafely(baseInput));
  });

  resetPlaytestNotificationSenderForTests();
  console.log("Playtest notification tests completed.");
})().catch((error) => {
  resetPlaytestNotificationSenderForTests();
  console.error(error);
  process.exit(1);
});
