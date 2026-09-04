import assert from "node:assert/strict";
import {
  CharacterSheetStatus,
  ContextClassification,
  ContextVersionStatus,
  ContextVisibility,
  ParticipantConsentStatus,
  PublicCampaignStatus,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import { AppError } from "../../../errors/AppError";
import { openApiDocument } from "../../../docs/openapi";
import { CampaignCharacterDraftService } from "../campaignCharacterDraft.service";

const slug = "piloto-story-1-5";

const makeState = () => {
  const characters: any[] = [];
  let nextCharacter = 1;
  let transactionQueue = Promise.resolve();
  const campaign: any = {
    id: "campaign-1",
    slug,
    status: PublicCampaignStatus.ACTIVE,
    tableId: "table-1",
    builderConfigVersion: "pilot-v1",
    consentVersion: "research-pilot-v1",
    table: {
      id: "table-1",
      status: TableStatus.RECRUITING,
      maxPlayers: 8,
      settingId: "setting-1",
      episodeId: "episode-1",
      contextVersionId: "context-1",
      contextVersion: {
        id: "context-1",
        settingId: "setting-1",
        episodeId: "episode-1",
        version: 1,
        layer: "PLAYTEST_VALIDATION",
        status: ContextVersionStatus.PUBLISHED,
        setting: { id: "setting-1", stableKey: "bravantus", title: "Bravantus" },
        episode: { id: "episode-1", stableKey: "episodio-1", title: "Episodio 1" },
        units: [
          {
            id: "public-1",
            classification: ContextClassification.PUBLIC_CANON,
            visibility: ContextVisibility.PUBLIC,
            title: "O chamado",
            content: "Os guardioes foram convocados.",
            sortOrder: 1,
          },
        ],
      },
    },
  };
  const state = {
    campaign,
    consentStatus: ParticipantConsentStatus.ACCEPTED as ParticipantConsentStatus,
    membership: {
      id: "member-1",
      role: TableMemberRole.PLAYER,
      status: TableMemberStatus.ACTIVE,
    } as any,
    activeMembers: 1,
    characters,
  };

  const tx: any = {
    $queryRaw: async (_query: TemplateStringsArray, ...values: unknown[]) =>
      values.includes(slug)
        ? [{ id: campaign.id, tableId: campaign.tableId }]
        : [{ id: campaign.tableId }],
    publicCampaign: { findUnique: async () => campaign },
    participantConsent: {
      findUnique: async () => ({ status: state.consentStatus }),
    },
    tableMember: {
      findUnique: async () => state.membership,
      count: async () => state.activeMembers,
    },
    character: {
      findMany: async () => [...characters].slice(0, 2),
      create: async ({ data }: any) => {
        const character = {
          id: `character-${nextCharacter++}`,
          name: data.name,
          sheetStatus: data.sheetStatus,
          sheetRevision: data.sheetRevision,
          submittedRevision: null,
          submittedAt: null,
          approvedAt: null,
          builderConfigVersion: data.builderConfigVersion,
          createdAt: new Date(),
        };
        characters.push(character);
        return character;
      },
    },
    class: { findFirst: async () => ({ id: "class-1" }) },
    finalSurveyResponse: { findUnique: async () => null },
  };
  const db: any = {
    $transaction: async (callback: (client: any) => Promise<unknown>) => {
      const previous = transactionQueue;
      let release: () => void = () => {};
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await callback(tx);
      } finally {
        release();
      }
    },
  };
  return { db, state };
};

const hasCode = (code: string) => (error: unknown) =>
  error instanceof AppError && error.code === code;

void (async () => {
  const concurrent = makeState();
  CampaignCharacterDraftService.setDbForTests(concurrent.db);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      CampaignCharacterDraftService.createOrResume("player-1", slug)
    )
  );
  assert.equal(concurrent.state.characters.length, 1);
  assert.equal(new Set(results.map((result) => result.character.id)).size, 1);
  assert.equal(results.filter((result) => result.created).length, 1);
  assert.equal(results[0].character.sheetStatus, CharacterSheetStatus.DRAFT);
  assert.equal(results[0].character.sheetRevision, 1);
  assert.equal(results[0].character.builderConfigVersion, "pilot-v1");
  assert.equal(results[0].journeyState, "CHARACTER_DRAFT");
  assert.equal(results[0].nextRoute, `/campanhas/${slug}/personagem`);
  assert.equal(JSON.stringify(results[0].publicContext).includes("SECRET_CANON"), false);

  const noConsent = makeState();
  noConsent.state.consentStatus = ParticipantConsentStatus.REVOKED;
  CampaignCharacterDraftService.setDbForTests(noConsent.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("CAMPAIGN_CONSENT_REQUIRED")
  );
  assert.equal(noConsent.state.characters.length, 0);

  const full = makeState();
  full.state.membership = null;
  full.state.activeMembers = full.state.campaign.table.maxPlayers;
  CampaignCharacterDraftService.setDbForTests(full.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("PUBLIC_CAMPAIGN_FULL")
  );

  const closed = makeState();
  closed.state.campaign.status = PublicCampaignStatus.CLOSED;
  CampaignCharacterDraftService.setDbForTests(closed.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("PUBLIC_CAMPAIGN_CLOSED")
  );

  const removed = makeState();
  removed.state.membership.status = TableMemberStatus.REMOVED;
  CampaignCharacterDraftService.setDbForTests(removed.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("CAMPAIGN_MEMBERSHIP_REMOVED")
  );

  const missingContext = makeState();
  missingContext.state.campaign.table.contextVersion.units = [];
  CampaignCharacterDraftService.setDbForTests(missingContext.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("CAMPAIGN_PUBLIC_CONTEXT_REQUIRED")
  );

  const unsafeContext = makeState();
  unsafeContext.state.campaign.table.contextVersion.units[0].classification =
    ContextClassification.SECRET_CANON;
  CampaignCharacterDraftService.setDbForTests(unsafeContext.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("CAMPAIGN_PUBLIC_CONTEXT_UNSAFE")
  );

  const duplicateLegacy = makeState();
  duplicateLegacy.state.characters.push(
    {
      id: "legacy-1",
      name: "Um",
      sheetStatus: CharacterSheetStatus.DRAFT,
      sheetRevision: 1,
      submittedRevision: null,
      submittedAt: null,
      approvedAt: null,
      builderConfigVersion: "pilot-v1",
      createdAt: new Date(1),
    },
    {
      id: "legacy-2",
      name: "Dois",
      sheetStatus: CharacterSheetStatus.DRAFT,
      sheetRevision: 1,
      submittedRevision: null,
      submittedAt: null,
      approvedAt: null,
      builderConfigVersion: "pilot-v1",
      createdAt: new Date(2),
    }
  );
  CampaignCharacterDraftService.setDbForTests(duplicateLegacy.db);
  await assert.rejects(
    CampaignCharacterDraftService.createOrResume("player-1", slug),
    hasCode("CAMPAIGN_CHARACTER_CONFLICT")
  );

  const contract = openApiDocument as any;
  const operation = contract.paths["/api/v1/campaigns/public/{slug}/character-draft"]?.post;
  assert.ok(operation, "endpoint oficial deve estar publicado no OpenAPI");
  assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
  assert.equal(
    operation.responses["200"].content["application/json"].schema.$ref,
    "#/components/schemas/CampaignCharacterDraftResponse"
  );

  CampaignCharacterDraftService.resetDbForTests();
  console.log("Campaign character draft tests completed.");
})().catch((error) => {
  CampaignCharacterDraftService.resetDbForTests();
  console.error(error);
  process.exit(1);
});
