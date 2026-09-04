import {
  CharacterSheetStatus,
  ContextClassification,
  ContextVersionStatus,
  ContextVisibility,
  ParticipantConsentStatus,
  Prisma,
  PublicCampaignStatus,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import { resolveCampaignJourney } from "./campaignJourney";

const FORBIDDEN_PUBLIC_CONTEXT_MARKERS = [
  "gm_secret",
  "SECRET_CANON",
  "TABLE_MASTER",
  "AUTHOR_ADMIN",
] as const;

const characterSelect = {
  id: true,
  name: true,
  sheetStatus: true,
  sheetRevision: true,
  submittedRevision: true,
  submittedAt: true,
  approvedAt: true,
  builderConfigVersion: true,
  createdAt: true,
} satisfies Prisma.CharacterSelect;

type CampaignDraftDb = typeof defaultPrisma;

export class CampaignCharacterDraftService {
  private static db: CampaignDraftDb = defaultPrisma;

  static setDbForTests(db: CampaignDraftDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async createOrResume(userId: string, slug: string) {
    const result = await this.db.$transaction(async (tx) => {
      const lockedCampaign = await tx.$queryRaw<Array<{ id: string; tableId: string }>>`
        SELECT "id", "tableId" FROM "PublicCampaign" WHERE "slug" = ${slug} FOR UPDATE
      `;
      if (lockedCampaign.length === 0) {
        throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
      }
      await tx.$queryRaw`
        SELECT "id" FROM "Table" WHERE "id" = ${lockedCampaign[0].tableId} FOR UPDATE
      `;

      const campaign = await tx.publicCampaign.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          status: true,
          tableId: true,
          builderConfigVersion: true,
          consentVersion: true,
          table: {
            select: {
              id: true,
              status: true,
              maxPlayers: true,
              settingId: true,
              episodeId: true,
              contextVersionId: true,
              contextVersion: {
                select: {
                  id: true,
                  settingId: true,
                  episodeId: true,
                  version: true,
                  layer: true,
                  status: true,
                  setting: { select: { id: true, stableKey: true, title: true } },
                  episode: { select: { id: true, stableKey: true, title: true } },
                  units: {
                    where: {
                      visibility: ContextVisibility.PUBLIC,
                      classification: { not: ContextClassification.SECRET_CANON },
                    },
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
                    select: {
                      id: true,
                      classification: true,
                      visibility: true,
                      title: true,
                      content: true,
                      sortOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!campaign) {
        throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
      }
      if (campaign.status === PublicCampaignStatus.CLOSED) {
        throw new AppError(409, "Campanha encerrada.", "PUBLIC_CAMPAIGN_CLOSED");
      }
      if (
        campaign.status !== PublicCampaignStatus.ACTIVE ||
        campaign.table.status !== TableStatus.RECRUITING
      ) {
        throw new AppError(409, "Campanha indisponivel para criacao.", "PUBLIC_CAMPAIGN_UNAVAILABLE");
      }

      const consent = await tx.participantConsent.findUnique({
        where: {
          userId_campaignId_consentVersion: {
            userId,
            campaignId: campaign.id,
            consentVersion: campaign.consentVersion,
          },
        },
        select: { status: true },
      });
      if (consent?.status !== ParticipantConsentStatus.ACCEPTED) {
        throw new AppError(
          409,
          "Consentimento atual e obrigatorio para criar o personagem.",
          "CAMPAIGN_CONSENT_REQUIRED"
        );
      }

      const membership = await tx.tableMember.findUnique({
        where: { tableId_userId: { tableId: campaign.tableId, userId } },
        select: { id: true, role: true, status: true },
      });
      if (membership && membership.status !== TableMemberStatus.ACTIVE) {
        throw new AppError(
          409,
          "A participacao nesta campanha foi removida.",
          "CAMPAIGN_MEMBERSHIP_REMOVED"
        );
      }
      if (!membership) {
        const activeMembers = await tx.tableMember.count({
          where: { tableId: campaign.tableId, status: TableMemberStatus.ACTIVE },
        });
        if (activeMembers >= campaign.table.maxPlayers) {
          throw new AppError(
            409,
            "Campanha nao esta aceitando novos participantes.",
            "PUBLIC_CAMPAIGN_FULL"
          );
        }
        throw new AppError(
          409,
          "Entre na campanha antes de criar o personagem.",
          "CAMPAIGN_MEMBERSHIP_REQUIRED"
        );
      }
      if (membership.role !== TableMemberRole.PLAYER) {
        throw new AppError(
          403,
          "A criacao publica e exclusiva do participante.",
          "CAMPAIGN_PLAYER_REQUIRED"
        );
      }

      const contextVersion = campaign.table.contextVersion;
      if (
        contextVersion.status !== ContextVersionStatus.PUBLISHED ||
        contextVersion.id !== campaign.table.contextVersionId ||
        contextVersion.settingId !== campaign.table.settingId ||
        contextVersion.episodeId !== campaign.table.episodeId ||
        contextVersion.units.length === 0
      ) {
        throw new AppError(
          409,
          "O contexto publico da campanha ainda nao esta disponivel.",
          "CAMPAIGN_PUBLIC_CONTEXT_REQUIRED"
        );
      }

      const publicContext = {
        id: contextVersion.id,
        version: contextVersion.version,
        layer: contextVersion.layer,
        status: contextVersion.status,
        setting: contextVersion.setting,
        episode: contextVersion.episode,
        units: contextVersion.units.map((unit) => ({
          id: unit.id,
          classification: unit.classification,
          visibility: unit.visibility,
          title: unit.title,
          content: unit.content,
          sortOrder: unit.sortOrder,
        })),
      };
      this.assertPublicContextSafe(publicContext);

      BuilderService.getConfig(campaign.builderConfigVersion);
      const existing = await tx.character.findMany({
        where: { tableId: campaign.tableId, userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 2,
        select: characterSelect,
      });
      if (existing.length > 1) {
        throw new AppError(
          409,
          "Mais de um personagem foi encontrado para esta participacao.",
          "CAMPAIGN_CHARACTER_CONFLICT"
        );
      }

      let created = false;
      let character = existing[0];
      if (!character) {
        const legacyClass = await tx.class.findFirst({
          where: { tier: 1, evolvesFrom: null },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: { id: true },
        });
        if (!legacyClass) {
          throw new AppError(
            409,
            "A configuracao de criacao da campanha esta incompleta.",
            "CAMPAIGN_CHARACTER_CLASS_REQUIRED"
          );
        }
        character = await tx.character.create({
          data: {
            userId,
            tableId: campaign.tableId,
            classId: legacyClass.id,
            name: "",
            builderConfigVersion: campaign.builderConfigVersion,
            sheetStatus: CharacterSheetStatus.DRAFT,
            sheetRevision: 1,
          },
          select: characterSelect,
        });
        created = true;
      }

      const finalSurvey = await tx.finalSurveyResponse.findUnique({
        where: { userId_campaignId: { userId, campaignId: campaign.id } },
        select: { id: true },
      });
      const journey = resolveCampaignJourney(campaign.slug, character, Boolean(finalSurvey));

      return {
        campaignId: campaign.id,
        tableId: campaign.tableId,
        created,
        character: {
          id: character.id,
          name: character.name,
          sheetStatus: character.sheetStatus,
          sheetRevision: character.sheetRevision,
          submittedRevision: character.submittedRevision,
          submittedAt: character.submittedAt,
          approvedAt: character.approvedAt,
          builderConfigVersion: character.builderConfigVersion,
        },
        publicContext,
        journeyState: journey.state,
        nextRoute: journey.route,
      };
    });

    return result;
  }

  private static assertPublicContextSafe(context: {
    units: Array<{ classification: ContextClassification; visibility: ContextVisibility }>;
  }): void {
    const unsafeUnit = context.units.some(
      (unit) =>
        unit.visibility !== ContextVisibility.PUBLIC ||
        unit.classification === ContextClassification.SECRET_CANON
    );
    const serialized = JSON.stringify(context);
    const unsafeMarker = FORBIDDEN_PUBLIC_CONTEXT_MARKERS.some((marker) =>
      serialized.toLowerCase().includes(marker.toLowerCase())
    );
    if (unsafeUnit || unsafeMarker) {
      throw new AppError(
        409,
        "O contexto publico da campanha esta inconsistente.",
        "CAMPAIGN_PUBLIC_CONTEXT_UNSAFE"
      );
    }
  }
}
