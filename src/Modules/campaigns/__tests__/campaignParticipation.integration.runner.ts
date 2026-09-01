import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  AccountRole,
  ContextLayer,
  ContextVersionStatus,
  ParticipantConsentStatus,
  PrismaClient,
  PublicCampaignStatus,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import { AppError } from "../../../errors/AppError";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const TEST_DIRECT_URL = process.env.TEST_DIRECT_URL ?? TEST_DATABASE_URL;
const confirmed =
  process.env.RUN_CAMPAIGN_PARTICIPATION_DB_INTEGRATION === "1" &&
  process.env.TEST_DATABASE_CONFIRMED_DISPOSABLE === "true" &&
  Boolean(TEST_DATABASE_URL);

if (!confirmed) {
  throw new Error(
    "Configure RUN_CAMPAIGN_PARTICIPATION_DB_INTEGRATION=1, TEST_DATABASE_CONFIRMED_DISPOSABLE=true e TEST_DATABASE_URL para um PostgreSQL descartavel."
  );
}
if (
  TEST_DATABASE_URL === process.env.DATABASE_URL ||
  TEST_DATABASE_URL === process.env.DIRECT_URL ||
  !/test|tmp|ci|local/i.test(TEST_DATABASE_URL!)
) {
  throw new Error("TEST_DATABASE_URL parece compartilhado ou nao descartavel. Abortando Story 1.4.");
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

const { CampaignService } = require("../campaign.service") as typeof import("../campaign.service");
const prisma = new PrismaClient();
const runId = randomUUID();
const ids = {
  master: randomUUID(),
  player: randomUUID(),
  fullPlayer: randomUUID(),
  setting: randomUUID(),
  episode: randomUUID(),
  context: randomUUID(),
  table: randomUUID(),
  campaign: randomUUID(),
  fullTable: randomUUID(),
  fullCampaign: randomUUID(),
};
const slug = `participation-${runId}`;
const fullSlug = `participation-full-${runId}`;

async function cleanup(): Promise<void> {
  await prisma.analyticsEvent.deleteMany({ where: { campaignId: { in: [ids.campaign, ids.fullCampaign] } } });
  await prisma.participantConsent.deleteMany({ where: { campaignId: { in: [ids.campaign, ids.fullCampaign] } } });
  await prisma.publicCampaign.deleteMany({ where: { id: { in: [ids.campaign, ids.fullCampaign] } } });
  await prisma.tableMember.deleteMany({ where: { tableId: { in: [ids.table, ids.fullTable] } } });
  await prisma.table.deleteMany({ where: { id: { in: [ids.table, ids.fullTable] } } });
  await prisma.contextVersion.deleteMany({ where: { id: ids.context } });
  await prisma.episode.deleteMany({ where: { id: ids.episode } });
  await prisma.setting.deleteMany({ where: { id: ids.setting } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.master, ids.player, ids.fullPlayer] } } });
}

void (async () => {
  await cleanup();
  await prisma.user.createMany({
    data: [ids.master, ids.player, ids.fullPlayer].map((id, index) => ({
      id,
      nome: `Participation ${index}`,
      email: `participation-${index}-${runId}@example.test`,
      senha: "not-used-by-this-test",
      emailVerifiedAt: new Date(),
      accountRole: index === 0 ? AccountRole.ADMIN : AccountRole.USER,
    })),
  });
  await prisma.setting.create({
    data: { id: ids.setting, stableKey: `setting-${runId}`, title: "Integration", createdById: ids.master },
  });
  await prisma.episode.create({
    data: { id: ids.episode, settingId: ids.setting, stableKey: `episode-${runId}`, title: "Integration", createdById: ids.master },
  });
  await prisma.contextVersion.create({
    data: {
      id: ids.context,
      settingId: ids.setting,
      episodeId: ids.episode,
      layer: ContextLayer.PLAYTEST_VALIDATION,
      version: 1,
      status: ContextVersionStatus.PUBLISHED,
      origin: "story-1.4-integration",
      approvalNote: "Disposable integration fixture",
      createdById: ids.master,
      approvedById: ids.master,
      publishedAt: new Date(),
    },
  });
  await prisma.table.createMany({
    data: [
      { id: ids.table, masterId: ids.master, settingId: ids.setting, episodeId: ids.episode, contextVersionId: ids.context, name: "Participation", joinCode: `join-${runId}`, maxPlayers: 8, status: TableStatus.RECRUITING },
      { id: ids.fullTable, masterId: ids.master, settingId: ids.setting, episodeId: ids.episode, contextVersionId: ids.context, name: "Full", joinCode: `full-${runId}`, maxPlayers: 0, status: TableStatus.RECRUITING },
    ],
  });
  await prisma.publicCampaign.createMany({
    data: [
      { id: ids.campaign, tableId: ids.table, slug, title: "Participation", status: PublicCampaignStatus.ACTIVE, consentVersion: "research-pilot-v1", createdById: ids.master, activatedAt: new Date() },
      { id: ids.fullCampaign, tableId: ids.fullTable, slug: fullSlug, title: "Full", status: PublicCampaignStatus.ACTIVE, consentVersion: "research-pilot-v1", createdById: ids.master, activatedAt: new Date() },
    ],
  });

  const accepted = await Promise.all([
    CampaignService.recordConsent(ids.player, slug, { status: "ACCEPTED", consentVersion: "research-pilot-v1", source: "integration" }),
    CampaignService.recordConsent(ids.player, slug, { status: "ACCEPTED", consentVersion: "research-pilot-v1", source: "integration" }),
  ]);
  assert.equal(accepted.length, 2);
  assert.equal(await prisma.participantConsent.count({ where: { userId: ids.player, campaignId: ids.campaign } }), 1);
  assert.equal(await prisma.tableMember.count({ where: { userId: ids.player, tableId: ids.table } }), 1);

  await prisma.publicCampaign.update({ where: { id: ids.campaign }, data: { consentVersion: "research-pilot-v2" } });
  await assert.rejects(
    CampaignService.recordConsent(ids.player, slug, { status: "ACCEPTED", consentVersion: "research-pilot-v1" }),
    (error: unknown) => error instanceof AppError && error.code === "CONSENT_VERSION_MISMATCH"
  );
  const resume = await CampaignService.resumePublicCampaign(ids.player, slug);
  assert.equal(resume.journeyState, "CONSENT_REQUIRED");

  await CampaignService.recordConsent(ids.player, slug, { status: "ACCEPTED", consentVersion: "research-pilot-v2" });
  await CampaignService.recordConsent(ids.player, slug, { status: "REVOKED", consentVersion: "research-pilot-v2" });
  assert.equal(
    (await prisma.tableMember.findUnique({ where: { tableId_userId: { tableId: ids.table, userId: ids.player } } }))?.status,
    TableMemberStatus.REMOVED
  );
  assert.equal(
    (await prisma.participantConsent.findUnique({
      where: { userId_campaignId_consentVersion: { userId: ids.player, campaignId: ids.campaign, consentVersion: "research-pilot-v2" } },
    }))?.status,
    ParticipantConsentStatus.REVOKED
  );

  await assert.rejects(
    CampaignService.recordConsent(ids.fullPlayer, fullSlug, { status: "ACCEPTED", consentVersion: "research-pilot-v1" }),
    (error: unknown) => error instanceof AppError && error.code === "PUBLIC_CAMPAIGN_FULL"
  );
  assert.equal(await prisma.participantConsent.count({ where: { userId: ids.fullPlayer, campaignId: ids.fullCampaign } }), 0);
  assert.equal(await prisma.tableMember.count({ where: { userId: ids.fullPlayer, tableId: ids.fullTable } }), 0);

  console.log("Campaign participation PostgreSQL integration tests completed.");
})()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
