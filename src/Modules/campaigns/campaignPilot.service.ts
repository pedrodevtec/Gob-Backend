import {
  AccountRole,
  CharacterSheetStatus,
  Prisma,
  PublicCampaignStatus,
  TableMemberRole,
  TableMemberStatus,
} from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import {
  ANALYTICS_EVENT_KEYS,
  ANALYTICS_METADATA_VERSION,
  FINAL_SURVEY_QUESTIONS,
  FINAL_SURVEY_VERSION,
} from "./campaignPilot.config";
import {
  RecordAnalyticsEventInput,
  SubmitFinalSurveyInput,
} from "./campaignPilot.types";

const SECRET_PATTERNS = ["gm_secret", "secret_canon", "table_master", "author_admin"];

const aggregateCount = (group: { _count?: true | { _all?: number } }): number => {
  return typeof group._count === "object" ? group._count._all ?? 0 : 0;
};

export class CampaignPilotService {
  static getFinalSurveyConfig() {
    return {
      version: FINAL_SURVEY_VERSION,
      questions: FINAL_SURVEY_QUESTIONS,
    };
  }

  static async submitFinalSurvey(userId: string, slug: string, input: SubmitFinalSurveyInput) {
    const campaign = await this.requireSurveyCampaign(slug);
    await this.requireActivePlayer(userId, campaign.tableId);
    await this.requireSubmittedCharacter(userId, campaign.tableId);

    const answers = {
      character_understanding_score: input.characterUnderstandingScore,
      creation_experience_score: input.creationExperienceScore,
      ai_helpfulness_score: input.aiHelpfulnessScore,
      ai_boundary_problem: input.aiBoundaryProblem,
      ai_boundary_problem_details: input.aiBoundaryProblemDetails ?? null,
      story_impact_score: input.storyImpactScore,
      final_comment: input.finalComment ?? null,
    } satisfies Prisma.InputJsonObject;

    const response = await prisma.finalSurveyResponse.upsert({
      where: {
        userId_campaignId: {
          userId,
          campaignId: campaign.id,
        },
      },
      create: {
        userId,
        campaignId: campaign.id,
        tableId: campaign.tableId,
        role: TableMemberRole.PLAYER,
        surveyVersion: FINAL_SURVEY_VERSION,
        answers,
      },
      update: {
        surveyVersion: FINAL_SURVEY_VERSION,
        answers,
        submittedAt: new Date(),
      },
    });

    await this.recordAnalyticsEvent({
      userId,
      campaignId: campaign.id,
      tableId: campaign.tableId,
      eventKey: "final_survey_submitted",
      source: "campaign_public_flow",
    });
    await this.recordAnalyticsEvent({
      userId,
      campaignId: campaign.id,
      tableId: campaign.tableId,
      eventKey: "pilot_flow_completed",
      source: "campaign_public_flow",
    });

    return this.formatSurveyResponse(response);
  }

  static async getMyFinalSurvey(userId: string, slug: string) {
    const campaign = await this.requireSurveyCampaign(slug);
    await this.requireActivePlayer(userId, campaign.tableId);

    const response = await prisma.finalSurveyResponse.findUnique({
      where: {
        userId_campaignId: {
          userId,
          campaignId: campaign.id,
        },
      },
    });

    return response ? this.formatSurveyResponse(response) : null;
  }

  private static async requireSubmittedCharacter(userId: string, tableId: string) {
    const character = await prisma.character.findFirst({
      where: {
        tableId,
        userId,
        submittedAt: { not: null },
        sheetStatus: {
          in: [
            CharacterSheetStatus.SUBMITTED,
            CharacterSheetStatus.CHANGES_REQUESTED,
            CharacterSheetStatus.APPROVED,
          ],
        },
      },
      select: { id: true },
    });
    if (!character) {
      throw new AppError(
        409,
        "Envie seu personagem antes de responder a pesquisa.",
        "CHARACTER_SUBMISSION_REQUIRED"
      );
    }
  }

  static async recordCampaignEvent(userId: string, slug: string, input: RecordAnalyticsEventInput) {
    const campaign = await this.requireEventCampaign(slug);
    if (input.characterId) {
      const character = await prisma.character.findFirst({
        where: {
          id: input.characterId,
          tableId: campaign.tableId,
          userId,
        },
        select: { id: true },
      });

      if (!character) {
        throw new AppError(403, "Acesso negado ao personagem informado.", "CHARACTER_FORBIDDEN");
      }
    }

    const event = await this.recordAnalyticsEvent({
      userId,
      campaignId: campaign.id,
      tableId: campaign.tableId,
      characterId: input.characterId,
      sessionId: input.sessionId,
      source: input.source ?? "frontend",
      eventKey: input.eventKey,
      metadata: input.metadata,
    });

    return this.formatAnalyticsEvent(event);
  }

  static async getOperationalOverview(campaignId: string) {
    const campaign = await prisma.publicCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        tableId: true,
        builderConfigVersion: true,
        consentVersion: true,
        table: {
          select: {
            id: true,
            name: true,
            status: true,
            maxPlayers: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }

    const [
      consentGroups,
      memberGroups,
      characterGroups,
      suggestionGroups,
      finalSurveyCount,
      analyticsGroups,
      latestAnalyticsEvents,
      dossierSubmissions,
      participantRecords,
    ] = await prisma.$transaction([
      prisma.participantConsent.groupBy({
        by: ["status"],
        where: { campaignId: campaign.id },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.tableMember.groupBy({
        by: ["role", "status"],
        where: { tableId: campaign.tableId },
        orderBy: [{ role: "asc" }, { status: "asc" }],
        _count: { _all: true },
      }),
      prisma.character.groupBy({
        by: ["sheetStatus"],
        where: { tableId: campaign.tableId },
        orderBy: { sheetStatus: "asc" },
        _count: { _all: true },
      }),
      prisma.playerAiSuggestion.groupBy({
        by: ["status"],
        where: { tableId: campaign.tableId },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.finalSurveyResponse.count({
        where: { campaignId: campaign.id },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["eventKey"],
        where: { campaignId: campaign.id },
        orderBy: { eventKey: "asc" },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { campaignId: campaign.id },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          eventKey: true,
          occurredAt: true,
          userId: true,
          tableId: true,
          characterId: true,
          sessionId: true,
          source: true,
          metadataVersion: true,
        },
      }),
      prisma.character.findMany({
        where: {
          tableId: campaign.tableId,
          creativeDossier: { not: Prisma.JsonNull },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          tableId: true,
          userId: true,
          name: true,
          creativeDossier: true,
          sheetStatus: true,
          sheetRevision: true,
          submittedRevision: true,
          submittedAt: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      }),
      prisma.tableMember.findMany({
        where: { tableId: campaign.tableId },
        orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
              emailVerifiedAt: true,
              participantConsents: {
                where: { campaignId: campaign.id, consentVersion: campaign.consentVersion },
                select: { status: true, acceptedAt: true },
                take: 1,
              },
              characters: {
                where: { tableId: campaign.tableId },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1,
                select: {
                  id: true,
                  name: true,
                  sheetStatus: true,
                  sheetRevision: true,
                  submittedAt: true,
                  approvedAt: true,
                  narrativeResponses: true,
                  confirmedNarrativeContext: true,
                  builderConfigVersion: true,
                },
              },
              finalSurveyResponses: {
                where: { campaignId: campaign.id },
                select: { id: true, submittedAt: true },
                take: 1,
              },
              playerAiSuggestions: {
                where: { tableId: campaign.tableId },
                select: { id: true },
              },
            },
          },
        },
      }),
    ]);

    const formattedDossierSubmissions = dossierSubmissions.map((character) => ({
      id: character.id,
      characterId: character.id,
      tableId: character.tableId,
      userId: character.userId,
      user: {
        id: character.user.id,
        name: character.user.nome,
        email: character.user.email,
      },
      character: {
        id: character.id,
        name: character.name,
      },
      creativeDossier: character.creativeDossier,
      sheetStatus: character.sheetStatus,
      sheetRevision: character.sheetRevision,
      submittedRevision: character.submittedRevision,
      submittedAt: character.submittedAt,
      approvedAt: character.approvedAt,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    }));

    return {
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status,
        builderConfigVersion: campaign.builderConfigVersion,
        consentVersion: campaign.consentVersion,
      },
      table: campaign.table,
      participants: {
        membershipsByRoleAndStatus: memberGroups.map((group) => ({
          role: group.role,
          status: group.status,
          count: aggregateCount(group),
        })),
        items: participantRecords.map((membership) => {
          const character = membership.user.characters[0] ?? null;
          const consent = membership.user.participantConsents[0] ?? null;
          const survey = membership.user.finalSurveyResponses[0] ?? null;
          return {
            membershipId: membership.id,
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt,
            user: {
              id: membership.user.id,
              name: membership.user.nome,
              email: membership.user.email,
              emailVerified: Boolean(membership.user.emailVerifiedAt),
            },
            consent: consent
              ? { status: consent.status, acceptedAt: consent.acceptedAt }
              : null,
            character: character
              ? {
                  id: character.id,
                  name: character.name,
                  sheetStatus: character.sheetStatus,
                  sheetRevision: character.sheetRevision,
                  submittedAt: character.submittedAt,
                  approvedAt: character.approvedAt,
                  legacy: !character.narrativeResponses || !character.confirmedNarrativeContext,
                  builderConfigVersion: character.builderConfigVersion,
                }
              : null,
            survey: survey ? { submittedAt: survey.submittedAt } : null,
            aiSuggestionsCount: membership.user.playerAiSuggestions.length,
          };
        }),
      },
      consents: consentGroups.map((group) => ({
        status: group.status,
        count: aggregateCount(group),
      })),
      characters: characterGroups.map((group) => ({
        sheetStatus: group.sheetStatus,
        count: aggregateCount(group),
      })),
      aiSuggestions: suggestionGroups.map((group) => ({
        status: group.status,
        count: aggregateCount(group),
      })),
      finalSurvey: {
        responses: finalSurveyCount,
      },
      analytics: {
        eventsByKey: analyticsGroups.map((group) => ({
          eventKey: group.eventKey,
          count: aggregateCount(group),
        })),
        latestEvents: latestAnalyticsEvents,
      },
      dossierSubmissions: formattedDossierSubmissions,
      characterSubmissions: formattedDossierSubmissions,
    };
  }

  static async recordAnalyticsEvent(input: {
    eventKey: string;
    userId?: string;
    campaignId?: string;
    tableId?: string;
    characterId?: string;
    sessionId?: string;
    source?: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    if (!ANALYTICS_EVENT_KEYS.includes(input.eventKey as (typeof ANALYTICS_EVENT_KEYS)[number])) {
      throw new AppError(400, "Evento de analytics invalido.", "INVALID_ANALYTICS_EVENT");
    }
    this.assertSafeMetadata(input.metadata);

    return prisma.analyticsEvent.create({
      data: {
        eventKey: input.eventKey,
        userId: input.userId ?? null,
        campaignId: input.campaignId ?? null,
        tableId: input.tableId ?? null,
        characterId: input.characterId ?? null,
        sessionId: input.sessionId ?? null,
        source: input.source ?? null,
        metadataVersion: ANALYTICS_METADATA_VERSION,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  private static async requireSurveyCampaign(slug: string) {
    const campaign = await prisma.publicCampaign.findUnique({
      where: { slug },
      select: { id: true, tableId: true, status: true },
    });

    if (!campaign || campaign.status !== PublicCampaignStatus.ACTIVE) {
      throw new AppError(404, "Campanha nao encontrada ou indisponivel.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }

    return campaign;
  }

  private static async requireEventCampaign(slug: string) {
    const campaign = await prisma.publicCampaign.findUnique({
      where: { slug },
      select: { id: true, tableId: true, status: true },
    });

    if (!campaign || campaign.status !== PublicCampaignStatus.ACTIVE) {
      throw new AppError(404, "Campanha nao encontrada ou indisponivel.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }

    return campaign;
  }

  private static async requireActivePlayer(userId: string, tableId: string) {
    const [membership, user] = await Promise.all([
      prisma.tableMember.findUnique({
        where: { tableId_userId: { tableId, userId } },
        select: { role: true, status: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { accountRole: true } }),
    ]);

    const participantRole =
      membership?.role === TableMemberRole.PLAYER || user?.accountRole === AccountRole.ADMIN;
    if (!participantRole || membership?.status !== TableMemberStatus.ACTIVE) {
      throw new AppError(403, "Pesquisa restrita ao PLAYER ativo da campanha.", "CAMPAIGN_PLAYER_REQUIRED");
    }
  }

  private static assertSafeMetadata(metadata?: Prisma.InputJsonObject) {
    if (!metadata) {
      return;
    }

    const serialized = JSON.stringify(metadata).toLowerCase();
    if (SECRET_PATTERNS.some((pattern) => serialized.includes(pattern))) {
      throw new AppError(400, "Metadata de analytics contem marcador reservado.", "ANALYTICS_METADATA_FORBIDDEN");
    }
  }

  private static formatSurveyResponse(response: {
    id: string;
    userId: string;
    campaignId: string;
    tableId: string;
    role: string;
    surveyVersion: string;
    answers: Prisma.JsonValue;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: response.id,
      userId: response.userId,
      campaignId: response.campaignId,
      tableId: response.tableId,
      role: response.role,
      surveyVersion: response.surveyVersion,
      answers: response.answers,
      submittedAt: response.submittedAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  private static formatAnalyticsEvent(event: {
    id: string;
    eventKey: string;
    occurredAt: Date;
    userId: string | null;
    campaignId: string | null;
    tableId: string | null;
    characterId: string | null;
    sessionId: string | null;
    source: string | null;
    metadataVersion: string;
    createdAt: Date;
  }) {
    return {
      id: event.id,
      eventKey: event.eventKey,
      occurredAt: event.occurredAt,
      userId: event.userId,
      campaignId: event.campaignId,
      tableId: event.tableId,
      characterId: event.characterId,
      sessionId: event.sessionId,
      source: event.source,
      metadataVersion: event.metadataVersion,
      createdAt: event.createdAt,
    };
  }
}
