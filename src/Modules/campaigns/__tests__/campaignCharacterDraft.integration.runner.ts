import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  AccountRole,
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
  ParticipantConsentStatus,
  PrismaClient,
  PublicCampaignStatus,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import { AppError } from "../../../errors/AppError";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DIRECT_URL = process.env.TEST_DIRECT_URL ?? TEST_DATABASE_URL;
const confirmed =
  process.env.RUN_CAMPAIGN_DRAFT_DB_INTEGRATION === "1" &&
  process.env.TEST_DATABASE_CONFIRMED_DISPOSABLE === "true" &&
  Boolean(TEST_DATABASE_URL);

if (!confirmed) {
  throw new Error(
    "Configure RUN_CAMPAIGN_DRAFT_DB_INTEGRATION=1, TEST_DATABASE_CONFIRMED_DISPOSABLE=true e TEST_DATABASE_URL para um PostgreSQL descartavel."
  );
}
if (
  TEST_DATABASE_URL === process.env.DATABASE_URL ||
  TEST_DATABASE_URL === process.env.DIRECT_URL ||
  !/test|tmp|ci|local/i.test(TEST_DATABASE_URL!)
) {
  throw new Error("TEST_DATABASE_URL parece compartilhado ou nao descartavel. Abortando Story 1.5.");
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DIRECT_URL;

const migration = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env: process.env,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (migration.status !== 0) {
  throw new Error(`Falha ao aplicar migrations no banco descartavel:\n${migration.stdout}\n${migration.stderr}`);
}

const { CampaignCharacterDraftService } = require("../campaignCharacterDraft.service") as typeof import("../campaignCharacterDraft.service");
const prisma = new PrismaClient();
const runId = randomUUID();
const ids = {
  master: randomUUID(),
  player: randomUUID(),
  setting: randomUUID(),
  episode: randomUUID(),
  context: randomUUID(),
  table: randomUUID(),
  campaign: randomUUID(),
  characterClass: randomUUID(),
};
const slug = `draft-${runId}`;

async function cleanup(): Promise<void> {
  await prisma.analyticsEvent.deleteMany({ where: { campaignId: ids.campaign } });
  await prisma.character.deleteMany({ where: { tableId: ids.table } });
  await prisma.participantConsent.deleteMany({ where: { campaignId: ids.campaign } });
  await prisma.publicCampaign.deleteMany({ where: { id: ids.campaign } });
  await prisma.tableMember.deleteMany({ where: { tableId: ids.table } });
  await prisma.table.deleteMany({ where: { id: ids.table } });
  await prisma.contextUnit.deleteMany({ where: { contextVersionId: ids.context } });
  await prisma.contextVersion.deleteMany({ where: { id: ids.context } });
  await prisma.episode.deleteMany({ where: { id: ids.episode } });
  await prisma.setting.deleteMany({ where: { id: ids.setting } });
  await prisma.class.deleteMany({ where: { id: ids.characterClass } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.master, ids.player] } } });
}

void (async () => {
  await cleanup();
  await prisma.user.createMany({
    data: [
      { id: ids.master, nome: "Mestre", email: `master-${runId}@example.test`, senha: "not-used", emailVerifiedAt: new Date(), accountRole: AccountRole.ADMIN },
      { id: ids.player, nome: "Jogador", email: `player-${runId}@example.test`, senha: "not-used", emailVerifiedAt: new Date(), accountRole: AccountRole.USER },
    ],
  });
  await prisma.class.create({
    data: { id: ids.characterClass, name: `Classe ${runId}`, modifier: "{}", description: "Fixture Story 1.5" },
  });
  await prisma.setting.create({
    data: { id: ids.setting, stableKey: `setting-${runId}`, title: "Story 1.5", createdById: ids.master },
  });
  await prisma.episode.create({
    data: { id: ids.episode, settingId: ids.setting, stableKey: `episode-${runId}`, title: "Episodio", createdById: ids.master },
  });
  await prisma.contextVersion.create({
    data: {
      id: ids.context,
      settingId: ids.setting,
      episodeId: ids.episode,
      layer: ContextLayer.PLAYTEST_VALIDATION,
      version: 1,
      status: ContextVersionStatus.PUBLISHED,
      origin: "story-1.5-integration",
      approvalNote: "Disposable integration fixture",
      createdById: ids.master,
      approvedById: ids.master,
      publishedAt: new Date(),
      units: {
        create: [
          { classification: ContextClassification.PUBLIC_CANON, visibility: ContextVisibility.PUBLIC, title: "Publico", content: "Contexto aprovado", sortOrder: 1, createdById: ids.master },
          { classification: ContextClassification.SECRET_CANON, visibility: ContextVisibility.TABLE_MASTER, title: "Segredo", content: "Nunca retornar", sortOrder: 2, createdById: ids.master },
        ],
      },
    },
  });
  await prisma.table.create({
    data: {
      id: ids.table,
      masterId: ids.master,
      settingId: ids.setting,
      episodeId: ids.episode,
      contextVersionId: ids.context,
      name: "Story 1.5",
      joinCode: `s15-${runId}`,
      maxPlayers: 8,
      status: TableStatus.RECRUITING,
      members: {
        create: [
          { userId: ids.master, role: TableMemberRole.MASTER, status: TableMemberStatus.ACTIVE },
          { userId: ids.player, role: TableMemberRole.PLAYER, status: TableMemberStatus.ACTIVE },
        ],
      },
    },
  });
  await prisma.publicCampaign.create({
    data: {
      id: ids.campaign,
      tableId: ids.table,
      slug,
      title: "Story 1.5",
      status: PublicCampaignStatus.ACTIVE,
      builderConfigVersion: "pilot-v1",
      consentVersion: "research-pilot-v1",
      createdById: ids.master,
      activatedAt: new Date(),
    },
  });
  await prisma.participantConsent.create({
    data: {
      userId: ids.player,
      campaignId: ids.campaign,
      consentVersion: "research-pilot-v1",
      status: ParticipantConsentStatus.ACCEPTED,
      source: "integration",
      acceptedAt: new Date(),
    },
  });

  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () =>
      CampaignCharacterDraftService.createOrResume(ids.player, slug)
    )
  );
  assert.equal(await prisma.character.count({ where: { tableId: ids.table, userId: ids.player } }), 1);
  assert.equal(new Set(concurrent.map((result) => result.character.id)).size, 1);
  assert.equal(concurrent.filter((result) => result.created).length, 1);
  assert.equal(concurrent[0].publicContext.units.length, 1);
  assert.equal(concurrent[0].publicContext.units[0].visibility, ContextVisibility.PUBLIC);
  assert.equal(JSON.stringify(concurrent[0]).includes("Nunca retornar"), false);

  const resumed = await CampaignCharacterDraftService.createOrResume(ids.player, slug);
  assert.equal(resumed.created, false);
  assert.equal(resumed.character.id, concurrent[0].character.id);

  await prisma.publicCampaign.update({
    where: { id: ids.campaign },
    data: { status: PublicCampaignStatus.CLOSED, closedAt: new Date() },
  });
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume(ids.player, slug),
    (error: unknown) => error instanceof AppError && error.code === "PUBLIC_CAMPAIGN_CLOSED"
  );

  console.log("Campaign character draft PostgreSQL integration tests completed.");
})()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
