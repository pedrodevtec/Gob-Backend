import { ParticipantConsentStatus, TableMemberRole, TableMemberStatus } from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";

type ParticipationDb = Pick<typeof defaultPrisma, "character" | "tableMember" | "participantConsent">;

export class CampaignParticipationPolicy {
  private static db: ParticipationDb = defaultPrisma;

  static setDbForTests(db: ParticipationDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async requirePublicProfileEligibility(characterId: string): Promise<void> {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: {
        userId: true,
        tableId: true,
        table: { select: { publicCampaign: { select: { id: true, consentVersion: true } } } },
      },
    });
    const campaign = character?.table?.publicCampaign;
    if (!character?.tableId || !campaign) return;
    const tableId = character.tableId;

    const [membership, consent] = await Promise.all([
      this.db.tableMember.findFirst({
        where: {
          tableId,
          userId: character.userId,
          role: TableMemberRole.PLAYER,
          status: TableMemberStatus.ACTIVE,
        },
        select: { id: true },
      }),
      this.db.participantConsent.findUnique({
        where: {
          userId_campaignId_consentVersion: {
            userId: character.userId,
            campaignId: campaign.id,
            consentVersion: campaign.consentVersion,
          },
        },
        select: { status: true },
      }),
    ]);

    if (!membership || consent?.status !== ParticipantConsentStatus.ACCEPTED) {
      throw new AppError(404, "Personagem aprovado nao encontrado.", "PUBLIC_CHARACTER_NOT_FOUND");
    }
  }
}
