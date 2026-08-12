import {
  ParticipantConsentStatus,
  PublicCampaignStatus,
  TableMemberRole,
  TableMemberStatus,
  TableStatus,
} from "@prisma/client";
import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import { TableService } from "../tables/table.service";
import { CampaignPilotService } from "./campaignPilot.service";
import { resolveCampaignJourney } from "./campaignJourney";
import {
  CampaignStatusTransitionInput,
  CreatePublicCampaignInput,
  RecordConsentInput,
  UpdatePublicCampaignInput,
} from "./campaign.types";

const CONSENT_VERSION = "research-pilot-v1";
const CONSENT_TEXT =
  "Concordo em participar do piloto do Guardian of Bravantus. Autorizo o uso das minhas respostas, escolhas durante a criacao do personagem, interacoes com a IA, feedback e dados tecnicos de utilizacao para avaliar e melhorar a experiencia da plataforma.\n\nEntendo que minha participacao e voluntaria, que as sugestoes da IA nao representam decisoes definitivas e que posso solicitar a interrupcao da minha participacao e o tratamento aplicavel aos meus dados pelos canais informados no Aviso de Privacidade.";

const ACTIVE_PUBLIC_STATUSES: PublicCampaignStatus[] = [PublicCampaignStatus.ACTIVE];

export class CampaignService {
  static async getAdminCampaignBySlug(slug: string) {
    const campaign = await prisma.publicCampaign.findUnique({
      where: { slug },
      include: this.campaignInclude(),
    });
    if (!campaign) {
      throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }
    return this.formatPublicCampaign(campaign);
  }

  static async createPublicCampaign(userId: string, input: CreatePublicCampaignInput) {
    const table = await prisma.table.findUnique({
      where: { id: input.tableId },
      select: { id: true },
    });
    if (!table) {
      throw new AppError(404, "Mesa nao encontrada.", "TABLE_NOT_FOUND");
    }

    const slug = await this.buildUniqueSlug(input.slug ?? input.title);
    const campaign = await prisma.publicCampaign.create({
      data: {
        tableId: input.tableId,
        title: input.title,
        description: input.description ?? null,
        slug,
        status: PublicCampaignStatus.DRAFT,
        builderConfigVersion: BuilderService.getActiveConfig().version,
        consentVersion: CONSENT_VERSION,
        createdById: userId,
      },
      include: this.campaignInclude(),
    });

    return this.formatManagementCampaign(campaign);
  }

  static async updatePublicCampaign(userId: string, campaignId: string, input: UpdatePublicCampaignInput) {
    const campaign = await prisma.publicCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }
    if (campaign.status !== PublicCampaignStatus.DRAFT) {
      throw new AppError(409, "Campanha ativa ou encerrada nao permite alterar slug ou dados publicos.", "PUBLIC_CAMPAIGN_IMMUTABLE");
    }

    const slug = input.slug ? await this.buildUniqueSlug(input.slug, campaign.id) : undefined;
    const updated = await prisma.publicCampaign.update({
      where: { id: campaign.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(slug !== undefined ? { slug } : {}),
        updatedById: userId,
      },
      include: this.campaignInclude(),
    });

    return this.formatManagementCampaign(updated);
  }

  static async transitionPublicCampaign(userId: string, campaignId: string, input: CampaignStatusTransitionInput) {
    const campaign = await prisma.publicCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new AppError(404, "Campanha nao encontrada.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }

    if (campaign.status === PublicCampaignStatus.CLOSED) {
      throw new AppError(409, "Campanha encerrada nao pode mudar de estado.", "PUBLIC_CAMPAIGN_CLOSED");
    }
    if (input.status === PublicCampaignStatus.ACTIVE && campaign.status !== PublicCampaignStatus.DRAFT) {
      throw new AppError(409, "Somente campanha DRAFT pode ser ativada.", "INVALID_PUBLIC_CAMPAIGN_TRANSITION");
    }

    const updated = await prisma.publicCampaign.update({
      where: { id: campaign.id },
      data: {
        status: input.status,
        updatedById: userId,
        ...(input.status === PublicCampaignStatus.ACTIVE ? { activatedAt: new Date() } : {}),
        ...(input.status === PublicCampaignStatus.CLOSED ? { closedAt: new Date() } : {}),
      },
      include: this.campaignInclude(),
    });

    return this.formatManagementCampaign(updated);
  }

  static async getPublicLanding(slug: string) {
    const campaign = await this.findAvailableCampaignBySlug(slug);
    await CampaignPilotService.recordAnalyticsEvent({
      campaignId: campaign.id,
      tableId: campaign.tableId,
      eventKey: "campaign_landing_viewed",
      source: "campaign_public_flow",
    });
    return this.formatPublicCampaign(campaign);
  }

  static getConsentDocument() {
    return {
      version: CONSENT_VERSION,
      text: CONSENT_TEXT,
      requiresLegalReviewBeforeExternalPilot: true,
    };
  }

  static async recordConsent(userId: string, slug: string, input: RecordConsentInput) {
    const campaign = await this.findAvailableCampaignBySlug(slug);
    const now = new Date();
    const consent = await prisma.participantConsent.upsert({
      where: {
        userId_campaignId_consentVersion: {
          userId,
          campaignId: campaign.id,
          consentVersion: campaign.consentVersion,
        },
      },
      create: {
        userId,
        campaignId: campaign.id,
        consentVersion: campaign.consentVersion,
        status: input.status,
        source: input.source ?? "campaign_public_flow",
        acceptedAt: input.status === ParticipantConsentStatus.ACCEPTED ? now : null,
      },
      update: {
        status: input.status,
        source: input.source ?? "campaign_public_flow",
        acceptedAt: input.status === ParticipantConsentStatus.ACCEPTED ? now : null,
        revokedAt: null,
      },
    });
    await CampaignPilotService.recordAnalyticsEvent({
      userId,
      campaignId: campaign.id,
      tableId: campaign.tableId,
      eventKey: "consent_recorded",
      source: input.source ?? "campaign_public_flow",
      metadata: { status: input.status },
    });

    return {
      consent: this.formatConsent(consent),
      campaign: this.formatPublicCampaign(campaign),
    };
  }

  static async joinPublicCampaign(userId: string, slug: string) {
    const campaign = await this.findAvailableCampaignBySlug(slug);
    const acceptedConsent = await prisma.participantConsent.findUnique({
      where: {
        userId_campaignId_consentVersion: {
          userId,
          campaignId: campaign.id,
          consentVersion: campaign.consentVersion,
        },
      },
    });

    if (acceptedConsent?.status !== ParticipantConsentStatus.ACCEPTED) {
      throw new AppError(409, "Consentimento atual e obrigatorio para entrar na campanha.", "CAMPAIGN_CONSENT_REQUIRED");
    }

    const membership = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Table" WHERE id = ${campaign.tableId} FOR UPDATE`;
      const table = await tx.table.findUnique({
        where: { id: campaign.tableId },
        include: { members: true },
      });

      if (!table || table.status !== TableStatus.RECRUITING) {
        throw new AppError(404, "Campanha nao encontrada ou indisponivel.", "PUBLIC_CAMPAIGN_NOT_FOUND");
      }

      const existing = table.members.find((member) => member.userId === userId);
      if (existing?.status === TableMemberStatus.ACTIVE) {
        return existing;
      }
      if (existing) {
        throw new AppError(409, "Participante nao pode reentrar nesta mesa.", "TABLE_MEMBERSHIP_NOT_ELIGIBLE");
      }

      const activeMembers = table.members.filter((member) => member.status === TableMemberStatus.ACTIVE);
      if (activeMembers.length >= table.maxPlayers) {
        throw new AppError(409, "Campanha nao esta aceitando novos participantes.", "PUBLIC_CAMPAIGN_FULL");
      }

      return tx.tableMember.create({
        data: {
          tableId: table.id,
          userId,
          role: TableMemberRole.PLAYER,
          status: TableMemberStatus.ACTIVE,
        },
      });
    });
    await CampaignPilotService.recordAnalyticsEvent({
      userId,
      campaignId: campaign.id,
      tableId: campaign.tableId,
      eventKey: "campaign_joined",
      source: "campaign_public_flow",
    });

    return {
      campaign: this.formatPublicCampaign(campaign),
      membership,
    };
  }

  static async resumePublicCampaign(userId: string, slug: string) {
    const campaign = await this.findAvailableCampaignBySlug(slug);
    const consent = await prisma.participantConsent.findUnique({
      where: {
        userId_campaignId_consentVersion: {
          userId,
          campaignId: campaign.id,
          consentVersion: campaign.consentVersion,
        },
      },
    });
    const membership = await prisma.tableMember.findUnique({
      where: {
        tableId_userId: {
          tableId: campaign.tableId,
          userId,
        },
      },
    });
    const activeMembership = membership?.status === TableMemberStatus.ACTIVE ? membership : null;

    if (consent?.status !== ParticipantConsentStatus.ACCEPTED) {
      return {
        campaign: this.formatPublicCampaign(campaign),
        consent: consent ? this.formatConsent(consent) : null,
        membership: null,
        playerOverview: null,
        character: null,
        finalSurvey: null,
        journeyState: "CONSENT_REQUIRED",
        nextRoute: `/campanhas/${campaign.slug}/consentimento`,
        nextRecommendedAction: {
          key: "ACCEPT_CONSENT",
          journeyState: "CONSENT_REQUIRED",
          route: `/campanhas/${campaign.slug}/consentimento`,
          title: "Aceitar consentimento",
          description: "Aceite o consentimento vigente antes de entrar na campanha.",
          ctaLabel: "Ver consentimento",
        },
      };
    }

    if (!activeMembership) {
      return {
        campaign: this.formatPublicCampaign(campaign),
        consent: this.formatConsent(consent),
        membership: null,
        playerOverview: null,
        character: null,
        finalSurvey: null,
        journeyState: "JOIN_REQUIRED",
        nextRoute: `/campanhas/${campaign.slug}/consentimento`,
        nextRecommendedAction: {
          key: "JOIN_CAMPAIGN",
          journeyState: "JOIN_REQUIRED",
          route: `/campanhas/${campaign.slug}/consentimento`,
          title: "Entrar na campanha",
          description: "Entre na campanha para iniciar a criacao do personagem.",
          ctaLabel: "Entrar",
        },
      };
    }

    const [character, finalSurvey] = await Promise.all([
      prisma.character.findFirst({
        where: { tableId: campaign.tableId, userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          name: true,
          sheetStatus: true,
          sheetRevision: true,
          submittedRevision: true,
          submittedAt: true,
          approvedAt: true,
          builderConfigVersion: true,
        },
      }),
      prisma.finalSurveyResponse.findUnique({
        where: { userId_campaignId: { userId, campaignId: campaign.id } },
        select: { id: true, surveyVersion: true, submittedAt: true },
      }),
    ]);
    const journey = resolveCampaignJourney(campaign.slug, character, Boolean(finalSurvey));

    return {
      campaign: this.formatPublicCampaign(campaign),
      consent: this.formatConsent(consent),
      membership: activeMembership,
      playerOverview:
        activeMembership.role === TableMemberRole.PLAYER
          ? await TableService.getPlayerOverview(userId, campaign.tableId)
          : null,
      character,
      finalSurvey,
      journeyState: journey.state,
      nextRoute: journey.route,
      nextRecommendedAction: {
        key: journey.actionKey,
        journeyState: journey.state,
        route: journey.route,
        title: journey.title,
        description: journey.description,
        ctaLabel: journey.ctaLabel,
      },
    };
  }

  private static async findAvailableCampaignBySlug(slug: string) {
    const campaign = await prisma.publicCampaign.findUnique({
      where: { slug },
      include: this.campaignInclude(),
    });

    if (!campaign || !ACTIVE_PUBLIC_STATUSES.includes(campaign.status) || campaign.table.status !== TableStatus.RECRUITING) {
      throw new AppError(404, "Campanha nao encontrada ou indisponivel.", "PUBLIC_CAMPAIGN_NOT_FOUND");
    }

    return campaign;
  }

  private static async buildUniqueSlug(raw: string, currentCampaignId?: string): Promise<string> {
    const base = this.slugify(raw);
    for (let index = 0; index < 100; index += 1) {
      const candidate = index === 0 ? base : `${base}-${index + 1}`;
      const existing = await prisma.publicCampaign.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentCampaignId) {
        return candidate;
      }
    }

    throw new AppError(409, "Nao foi possivel gerar slug unico para a campanha.", "PUBLIC_CAMPAIGN_SLUG_CONFLICT");
  }

  private static slugify(raw: string): string {
    const slug = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    if (slug.length < 3 || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new AppError(400, "Nome ou slug nao gera identificador publico valido.", "INVALID_CAMPAIGN_SLUG");
    }

    return slug;
  }

  private static campaignInclude() {
    return {
      table: {
        select: {
          id: true,
          name: true,
          status: true,
          maxPlayers: true,
          world: {
            select: {
              campaignTitle: true,
              summary: true,
              tone: true,
            },
          },
          _count: {
            select: {
              members: { where: { status: TableMemberStatus.ACTIVE } },
            },
          },
        },
      },
    } as const;
  }

  private static formatPublicCampaign(campaign: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: PublicCampaignStatus;
    builderConfigVersion: string;
    consentVersion: string;
    table: {
      name: string;
      status: TableStatus;
      maxPlayers: number;
      world: { campaignTitle: string; summary: string; tone: string | null } | null;
      _count: { members: number };
    };
  }) {
    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      builderConfigVersion: campaign.builderConfigVersion,
      consentVersion: campaign.consentVersion,
      table: {
        name: campaign.table.name,
        status: campaign.table.status,
        seats: {
          maxPlayers: campaign.table.maxPlayers,
          activeMembers: campaign.table._count.members,
        },
      },
      world: campaign.table.world
        ? {
            title: campaign.table.world.campaignTitle,
            summary: campaign.table.world.summary,
            tone: campaign.table.world.tone,
          }
        : null,
    };
  }

  private static formatManagementCampaign(campaign: Awaited<ReturnType<typeof prisma.publicCampaign.findFirst>> & any) {
    return {
      ...this.formatPublicCampaign(campaign),
      tableId: campaign.tableId,
      createdById: campaign.createdById,
      updatedById: campaign.updatedById,
      activatedAt: campaign.activatedAt,
      closedAt: campaign.closedAt,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private static formatConsent(consent: {
    id: string;
    userId: string;
    campaignId: string;
    consentVersion: string;
    status: ParticipantConsentStatus;
    source: string;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: consent.id,
      userId: consent.userId,
      campaignId: consent.campaignId,
      consentVersion: consent.consentVersion,
      status: consent.status,
      source: consent.source,
      acceptedAt: consent.acceptedAt,
      revokedAt: consent.revokedAt,
      createdAt: consent.createdAt,
      updatedAt: consent.updatedAt,
    };
  }
}
