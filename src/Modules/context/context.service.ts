import {
  ContextClassification,
  ContextLayer,
  ContextVersionStatus,
  ContextVisibility,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import {
  AddContextUnitInput,
  ContextVersionLookupInput,
  CreateContextVersionInput,
  CreateEpisodeInput,
  CreateSettingInput,
} from "./context.types";

const PUBLIC_VISIBILITIES: ContextVisibility[] = [
  ContextVisibility.PUBLIC,
  ContextVisibility.SPECTATOR,
  ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
];

const SECRET_VISIBILITIES: ContextVisibility[] = [
  ContextVisibility.TABLE_MASTER,
  ContextVisibility.AUTHOR_ADMIN,
  ContextVisibility.SPECIFIC_CHARACTER,
];

type ContextDb = typeof defaultPrisma;

export class ContextService {
  private static db: ContextDb = defaultPrisma;

  static setDbForTests(db: ContextDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async createSetting(userId: string, input: CreateSettingInput) {
    try {
      return await this.db.setting.create({
        data: { ...input, createdById: userId },
      });
    } catch (error) {
      this.mapUniqueError(error, "DUPLICATED_STABLE_IDENTIFIER");
    }
  }

  static async createEpisode(userId: string, input: CreateEpisodeInput) {
    await this.ensureSetting(input.settingId);
    try {
      return await this.db.episode.create({
        data: { ...input, createdById: userId },
      });
    } catch (error) {
      this.mapUniqueError(error, "DUPLICATED_STABLE_IDENTIFIER");
    }
  }

  static async createContextVersion(userId: string, input: CreateContextVersionInput) {
    const setting = await this.ensureSetting(input.settingId);
    const episode = input.episodeId ? await this.ensureEpisode(input.episodeId) : null;
    if (episode && episode.settingId !== setting.id) {
      throw new AppError(400, "Episodio nao pertence ao Setting informado.", "INVALID_SETTING_EPISODE_RELATIONSHIP");
    }

    try {
      return await this.db.contextVersion.create({
        data: {
          settingId: setting.id,
          episodeId: episode?.id,
          layer: input.layer,
          version: input.version,
          origin: input.origin,
          approvalNote: input.approvalNote,
          createdById: userId,
        },
      });
    } catch (error) {
      this.mapUniqueError(error, "INVALID_CONTEXT_VERSION");
    }
  }

  static async addContextUnit(userId: string, input: AddContextUnitInput) {
    this.assertClassificationVisibility(input.classification, input.visibility);
    const version = await this.ensureContextVersion(input.contextVersionId);
    if (version.status !== ContextVersionStatus.DRAFT) {
      throw new AppError(409, "Versao publicada ou arquivada nao pode ser editada.", "CONTEXT_VERSION_IMMUTABLE");
    }

    return this.db.contextUnit.create({
      data: {
        ...input,
        sortOrder: input.sortOrder ?? 0,
        createdById: userId,
      },
    });
  }

  static async publishContextVersion(userId: string, versionId: string) {
    const version = await this.db.contextVersion.findUnique({
      where: { id: versionId },
      include: { units: true },
    });
    if (!version) {
      throw new AppError(404, "Versao de contexto nao encontrada.", "CONTEXT_VERSION_NOT_FOUND");
    }
    if (version.status !== ContextVersionStatus.DRAFT) {
      throw new AppError(409, "Transicao de status invalida.", "INVALID_CONTEXT_STATUS_TRANSITION");
    }

    const hasPublic = version.units.some(
      (unit) =>
        unit.classification === ContextClassification.PUBLIC_CANON &&
        PUBLIC_VISIBILITIES.includes(unit.visibility)
    );
    const hasSecret = version.units.some(
      (unit) =>
        unit.classification === ContextClassification.SECRET_CANON &&
        SECRET_VISIBILITIES.includes(unit.visibility)
    );
    if (!hasPublic || !hasSecret || !version.origin || !version.approvalNote) {
      throw new AppError(409, "Contexto incompleto para publicacao.", "CONTEXT_VERSION_INCOMPLETE");
    }

    return this.db.contextVersion.update({
      where: { id: versionId },
      data: {
        status: ContextVersionStatus.PUBLISHED,
        approvedById: userId,
        updatedById: userId,
        publishedAt: new Date(),
      },
    });
  }

  static async archiveContextVersion(userId: string, versionId: string) {
    const version = await this.ensureContextVersion(versionId);
    if (version.status !== ContextVersionStatus.PUBLISHED) {
      throw new AppError(409, "Transicao de status invalida.", "INVALID_CONTEXT_STATUS_TRANSITION");
    }

    return this.db.contextVersion.update({
      where: { id: versionId },
      data: {
        status: ContextVersionStatus.ARCHIVED,
        updatedById: userId,
        archivedAt: new Date(),
      },
    });
  }

  static async getActivePublicContext(input: ContextVersionLookupInput) {
    const setting = await this.db.setting.findUnique({
      where: { stableKey: input.settingStableKey },
    });
    if (!setting) {
      throw new AppError(404, "Contexto publicado nao encontrado.", "NO_ACTIVE_CONTEXT_VERSION");
    }

    const episode = input.episodeStableKey
      ? await this.db.episode.findFirst({
          where: { settingId: setting.id, stableKey: input.episodeStableKey },
        })
      : null;
    if (input.episodeStableKey && !episode) {
      throw new AppError(404, "Contexto publicado nao encontrado.", "NO_ACTIVE_CONTEXT_VERSION");
    }

    const contextVersion = await this.db.contextVersion.findFirst({
      where: {
        settingId: setting.id,
        episodeId: episode?.id ?? null,
        layer: input.layer ?? ContextLayer.EPISODE,
        status: ContextVersionStatus.PUBLISHED,
      },
      orderBy: { version: "desc" },
      include: {
        units: {
          where: {
            visibility: { in: PUBLIC_VISIBILITIES },
            classification: { not: ContextClassification.SECRET_CANON },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        setting: true,
        episode: true,
      },
    });

    if (!contextVersion || contextVersion.units.length === 0) {
      throw new AppError(404, "Contexto publicado nao encontrado.", "NO_ACTIVE_CONTEXT_VERSION");
    }

    return this.toPublicContextDto(contextVersion);
  }

  static async getPublicVersion(versionId: string) {
    const contextVersion = await this.db.contextVersion.findFirst({
      where: { id: versionId, status: ContextVersionStatus.PUBLISHED },
      include: {
        units: {
          where: {
            visibility: { in: PUBLIC_VISIBILITIES },
            classification: { not: ContextClassification.SECRET_CANON },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        setting: true,
        episode: true,
      },
    });
    if (!contextVersion || contextVersion.units.length === 0) {
      throw new AppError(404, "Contexto publicado nao encontrado.", "NO_ACTIVE_CONTEXT_VERSION");
    }

    return this.toPublicContextDto(contextVersion);
  }

  static async getPublicUnit(unitId: string) {
    const unit = await this.db.contextUnit.findFirst({
      where: {
        id: unitId,
        visibility: { in: PUBLIC_VISIBILITIES },
        classification: { not: ContextClassification.SECRET_CANON },
        contextVersion: { status: ContextVersionStatus.PUBLISHED },
      },
      select: {
        id: true,
        title: true,
        content: true,
        classification: true,
        visibility: true,
      },
    });
    if (!unit) {
      throw new AppError(404, "Contexto publicado nao encontrado.", "NO_ACTIVE_CONTEXT_VERSION");
    }

    return unit;
  }

  static async getAuthorizedVersion(versionId: string) {
    const contextVersion = await this.db.contextVersion.findUnique({
      where: { id: versionId },
      include: {
        units: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        setting: true,
        episode: true,
      },
    });
    if (!contextVersion) {
      throw new AppError(404, "Versao de contexto nao encontrada.", "CONTEXT_VERSION_NOT_FOUND");
    }

    return this.toManagementContextDto(contextVersion);
  }

  static async listVersions() {
    const versions = await this.db.contextVersion.findMany({
      include: {
        setting: true,
        episode: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return versions.map((version) => ({
      id: version.id,
      version: version.version,
      layer: version.layer,
      status: version.status,
      setting: { id: version.setting.id, stableKey: version.setting.stableKey, title: version.setting.title },
      episode: version.episode
        ? { id: version.episode.id, stableKey: version.episode.stableKey, title: version.episode.title }
        : null,
      origin: version.origin,
      approvalNote: version.approvalNote,
      publishedAt: version.publishedAt,
      archivedAt: version.archivedAt,
      createdAt: version.createdAt,
    }));
  }

  private static async ensureSetting(settingId: string) {
    const setting = await this.db.setting.findUnique({ where: { id: settingId } });
    if (!setting) {
      throw new AppError(404, "Setting nao encontrado.", "SETTING_NOT_FOUND");
    }

    return setting;
  }

  private static async ensureEpisode(episodeId: string) {
    const episode = await this.db.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new AppError(404, "Episodio nao encontrado.", "EPISODE_NOT_FOUND");
    }

    return episode;
  }

  private static async ensureContextVersion(versionId: string) {
    const version = await this.db.contextVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new AppError(404, "Versao de contexto nao encontrada.", "CONTEXT_VERSION_NOT_FOUND");
    }

    return version;
  }

  private static assertClassificationVisibility(
    classification: ContextClassification,
    visibility: ContextVisibility
  ): void {
    if (classification === ContextClassification.SECRET_CANON && PUBLIC_VISIBILITIES.includes(visibility)) {
      throw new AppError(400, "Visibilidade invalida para contexto secreto.", "INVALID_CONTEXT_VISIBILITY");
    }
    if (classification === ContextClassification.PUBLIC_CANON && !PUBLIC_VISIBILITIES.includes(visibility)) {
      throw new AppError(400, "Visibilidade invalida para contexto publico.", "INVALID_CONTEXT_VISIBILITY");
    }
  }

  private static mapUniqueError(error: unknown, code: string): never {
    if (typeof error === "object" && error !== null && "code" in error && (error as any).code === "P2002") {
      throw new AppError(409, "Identificador ou versao duplicada.", code);
    }

    throw error;
  }

  private static toPublicContextDto(contextVersion: any) {
    return {
      id: contextVersion.id,
      version: contextVersion.version,
      layer: contextVersion.layer,
      status: contextVersion.status,
      setting: {
        id: contextVersion.setting.id,
        stableKey: contextVersion.setting.stableKey,
        title: contextVersion.setting.title,
      },
      episode: contextVersion.episode
        ? {
            id: contextVersion.episode.id,
            stableKey: contextVersion.episode.stableKey,
            title: contextVersion.episode.title,
          }
        : null,
      units: contextVersion.units.map((unit: any) => ({
        id: unit.id,
        classification: unit.classification,
        visibility: unit.visibility,
        title: unit.title,
        content: unit.content,
        sortOrder: unit.sortOrder,
      })),
    };
  }

  private static toManagementContextDto(contextVersion: any) {
    return {
      ...this.toPublicContextDto({ ...contextVersion, units: contextVersion.units }),
      origin: contextVersion.origin,
      approvalNote: contextVersion.approvalNote,
      approvedById: contextVersion.approvedById,
      publishedAt: contextVersion.publishedAt,
      archivedAt: contextVersion.archivedAt,
      units: contextVersion.units.map((unit: any) => ({
        id: unit.id,
        classification: unit.classification,
        visibility: unit.visibility,
        title: unit.title,
        content: unit.content,
        sortOrder: unit.sortOrder,
      })),
    };
  }
}
