import {
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
} from "@prisma/client";

export interface CreateSettingInput {
  stableKey: string;
  title: string;
  description?: string;
}

export interface CreateEpisodeInput {
  settingId: string;
  stableKey: string;
  title: string;
  synopsis?: string;
}

export interface CreateContextVersionInput {
  settingId: string;
  episodeId?: string;
  layer: ContextLayer;
  version: number;
  origin: string;
  approvalNote: string;
}

export interface AddContextUnitInput {
  contextVersionId: string;
  classification: ContextClassification;
  visibility: ContextVisibility;
  title: string;
  content: string;
  sortOrder?: number;
}

export interface ContextVersionLookupInput {
  settingStableKey: string;
  episodeStableKey?: string;
  layer?: ContextLayer;
}

export type ManagementStatus = ContextVersionStatus;
