import {
  CharacterSheetStatus,
  ContextClassification,
  ContextVersionStatus,
  ContextVisibility,
  TableMemberRole,
  TableMemberStatus,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";

export type PlayerAiContextUseCase =
  | "PLAYER_CHARACTER_CREATION"
  | "PLAYER_CHARACTER_VALIDATION";

export interface BuildPlayerAiContextInput {
  userId: string;
  tableId: string;
  useCase: PlayerAiContextUseCase;
  characterId?: string;
  maxContextUnits?: number;
}

const PLAYER_AI_VISIBILITIES: ContextVisibility[] = [
  ContextVisibility.PUBLIC,
  ContextVisibility.AUTHENTICATED_TABLE_PLAYER,
];

const FORBIDDEN_CONTEXT_MARKERS = [
  "gm_secret",
  "SECRET_CANON",
  "TABLE_MASTER",
  "AUTHOR_ADMIN",
];

type AiContextDb = typeof defaultPrisma;

export class AiContextService {
  private static db: AiContextDb = defaultPrisma;

  static setDbForTests(db: AiContextDb): void {
    this.db = db;
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
  }

  static async buildPlayerCharacterContext(input: BuildPlayerAiContextInput) {
    const maxContextUnits = Math.max(1, Math.min(input.maxContextUnits ?? 40, 80));

    const membership = await this.db.tableMember.findFirst({
      where: {
        tableId: input.tableId,
        userId: input.userId,
        status: TableMemberStatus.ACTIVE,
        role: TableMemberRole.PLAYER,
      },
      select: { id: true, tableId: true, userId: true, role: true, status: true },
    });

    if (!membership) {
      throw new AppError(403, "Contexto de IA restrito ao PLAYER ativo da mesa.", "AI_CONTEXT_PLAYER_REQUIRED");
    }

    const table = await this.db.table.findUnique({
      where: { id: input.tableId },
      select: {
        id: true,
        settingId: true,
        episodeId: true,
        contextVersionId: true,
        name: true,
        contextVersion: {
          select: {
            id: true,
            settingId: true,
            episodeId: true,
            layer: true,
            version: true,
            status: true,
            units: {
              where: {
                visibility: { in: PLAYER_AI_VISIBILITIES },
                classification: { not: ContextClassification.SECRET_CANON },
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
              take: maxContextUnits,
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
    });

    if (
      !table ||
      table.contextVersion.status !== ContextVersionStatus.PUBLISHED ||
      table.contextVersion.id !== table.contextVersionId ||
      table.contextVersion.settingId !== table.settingId ||
      table.contextVersion.episodeId !== table.episodeId
    ) {
      throw new AppError(404, "Contexto autorizado da mesa nao encontrado.", "AI_CONTEXT_NOT_FOUND");
    }

    const character = input.characterId
      ? await this.db.character.findFirst({
          where: {
            id: input.characterId,
            tableId: input.tableId,
            userId: input.userId,
          },
          select: {
            id: true,
            tableId: true,
            userId: true,
            name: true,
            concept: true,
            origin: true,
            appearance: true,
            desire: true,
            fear: true,
            promiseOrGuilt: true,
            reasonToActWithGroup: true,
            markLocation: true,
            markAppearance: true,
            markReaction: true,
            markAttitude: true,
            archetypeKey: true,
            attributes: true,
            trainings: true,
            positiveTrait: true,
            negativeTrait: true,
            narrativeBond: true,
            personalHistory: true,
            initialEquipment: true,
            sheetStatus: true,
            sheetRevision: true,
            episodeAnswers: {
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              select: {
                id: true,
                questionKey: true,
                promptSnapshot: true,
                answer: true,
              },
            },
          },
        })
      : null;

    if (input.useCase === "PLAYER_CHARACTER_VALIDATION" && !character) {
      throw new AppError(404, "Personagem nao encontrado para contexto de IA.", "AI_CONTEXT_CHARACTER_NOT_FOUND");
    }

    if (input.characterId && !character) {
      throw new AppError(404, "Personagem nao encontrado para contexto de IA.", "AI_CONTEXT_CHARACTER_NOT_FOUND");
    }

    const context = {
      useCase: input.useCase,
      actor: {
        userId: input.userId,
        tableRole: membership.role,
      },
      table: {
        id: table.id,
        name: table.name,
      },
      contextVersion: {
        id: table.contextVersion.id,
        version: table.contextVersion.version,
        layer: table.contextVersion.layer,
      },
      units: table.contextVersion.units.map((unit) => ({
        id: unit.id,
        classification: unit.classification,
        visibility: unit.visibility,
        title: unit.title,
        content: unit.content,
        sortOrder: unit.sortOrder,
      })),
      character: character
        ? {
            id: character.id,
            tableId: character.tableId,
            ownerUserId: character.userId,
            name: character.name,
            concept: character.concept,
            origin: character.origin,
            appearance: character.appearance,
            desire: character.desire,
            fear: character.fear,
            promiseOrGuilt: character.promiseOrGuilt,
            reasonToActWithGroup: character.reasonToActWithGroup,
            markLocation: character.markLocation,
            markAppearance: character.markAppearance,
            markReaction: character.markReaction,
            markAttitude: character.markAttitude,
            archetypeKey: character.archetypeKey,
            attributes: character.attributes,
            trainings: character.trainings,
            positiveTrait: character.positiveTrait,
            negativeTrait: character.negativeTrait,
            narrativeBond: character.narrativeBond,
            personalHistory: character.personalHistory,
            initialEquipment: character.initialEquipment,
            sheetStatus: character.sheetStatus as CharacterSheetStatus,
            sheetRevision: character.sheetRevision,
            episodeAnswers: character.episodeAnswers.map((answer) => ({
              id: answer.id,
              questionKey: answer.questionKey,
              promptSnapshot: answer.promptSnapshot,
              answer: answer.answer,
            })),
          }
        : null,
      sourceRefs: [
        ...table.contextVersion.units.map((unit) => ({
          type: "CONTEXT_UNIT" as const,
          id: unit.id,
          contextVersionId: table.contextVersion.id,
        })),
        ...(character
          ? [
              {
                type: "CHARACTER" as const,
                id: character.id,
                revision: character.sheetRevision,
              },
              ...character.episodeAnswers.map((answer) => ({
                type: "EPISODE_ANSWER" as const,
                id: answer.id,
                characterId: character.id,
              })),
            ]
          : []),
      ],
    };

    this.assertSecretSafe(context);
    return context;
  }

  private static assertSecretSafe(value: unknown): void {
    const serialized = JSON.stringify(value);
    for (const marker of FORBIDDEN_CONTEXT_MARKERS) {
      if (serialized.includes(marker)) {
        throw new AppError(500, "Contexto de IA bloqueado por conter dado protegido.", "AI_CONTEXT_SECRET_LEAK_BLOCKED");
      }
    }
  }
}
