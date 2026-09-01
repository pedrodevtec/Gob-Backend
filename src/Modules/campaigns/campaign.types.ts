import { ParticipantConsentStatus, PublicCampaignStatus } from "@prisma/client";

export interface CreatePublicCampaignInput {
  tableId: string;
  title: string;
  description?: string;
  slug?: string;
}

export interface UpdatePublicCampaignInput {
  title?: string;
  description?: string;
  slug?: string;
}

export interface RecordConsentInput {
  status: Extract<ParticipantConsentStatus, "ACCEPTED" | "DECLINED" | "REVOKED">;
  consentVersion: string;
  source?: string;
}

export interface CampaignStatusTransitionInput {
  status: Extract<PublicCampaignStatus, "ACTIVE" | "CLOSED">;
}
