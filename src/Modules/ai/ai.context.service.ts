import {
  CharacterSheetStatus,
  ContextClassification,
  ContextVersionStatus,
  ContextVisibility,
  TableMemberRole,
  TableMemberStatus,
} from "@prisma/client";
import crypto from "crypto";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";

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

export interface BuildAuthorizedCharacterBuilderContextInput {
  authenticatedUserId: string;
  tableId: string;
  characterId: string;
  targetChapter: string;
  targetFields: string[];
  expectedRevision: number;
  playerIntent?: string;
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

const EDITABLE_CHARACTER_STATUSES = new Set<CharacterSheetStatus>([
  CharacterSheetStatus.DRAFT,
  CharacterSheetStatus.CHANGES_REQUESTED,
]);

const ALLOWED_CHARACTER_AI_FIELDS = new Set([
  "name",
  "concept",
  "origin",
  "appearance",
  "desire",
  "fear",
  "promiseOrGuilt",
  "reasonToActWithGroup",
  "markLocation",
  "markAppearance",
  "markReaction",
  "markAttitude",
  "narrativeBond",
  "personalHistory",
  "positiveTrait",
  "negativeTrait",
  "initialEquipment",
]);

const MECHANICAL_FIELDS = new Set(["attributes", "trainings", "archetypeKey"]);

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

  static async buildAuthorizedCharacterBuilderContext(
    input: BuildAuthorizedCharacterBuilderContextInput
  ) {
    if (input.targetChapter !== "STORY") {
      throw new AppError(400, "Capitulo de sugestao nao suportado.", "INVALID_AI_TARGET_CHAPTER");
    }

    const normalizedFields = [...new Set(input.targetFields.map((field) => field.trim()))];
    if (!normalizedFields.length || normalizedFields.length > 3) {
      throw new AppError(400, "targetFields deve conter de 1 a 3 campos.", "INVALID_AI_TARGET_FIELDS");
    }
    for (const field of normalizedFields) {
      if (MECHANICAL_FIELDS.has(field) || !ALLOWED_CHARACTER_AI_FIELDS.has(field)) {
        throw new AppError(400, "Campo nao permitido para sugestao contextual.", "INVALID_AI_TARGET_FIELD");
      }
    }

    const membership = await this.db.tableMember.findFirst({
      where: {
        tableId: input.tableId,
        userId: input.authenticatedUserId,
        status: TableMemberStatus.ACTIVE,
        role: TableMemberRole.PLAYER,
      },
      select: { role: true },
    });
    if (!membership) {
      throw new AppError(403, "Sugestao restrita ao PLAYER ativo dono do personagem.", "TABLE_PLAYER_REQUIRED");
    }

    const table = await this.db.table.findUnique({
      where: { id: input.tableId },
      select: {
        id: true,
        name: true,
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
            units: {
              where: {
                visibility: { in: PLAYER_AI_VISIBILITIES },
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

    const character = await this.db.character.findFirst({
      where: {
        id: input.characterId,
        tableId: input.tableId,
        userId: input.authenticatedUserId,
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
        positiveTrait: true,
        negativeTrait: true,
        narrativeBond: true,
        personalHistory: true,
        initialEquipment: true,
        builderConfigVersion: true,
        narrativeResponses: true,
        confirmedNarrativeContext: true,
        playStylePreference: true,
        sheetStatus: true,
        sheetRevision: true,
        episodeAnswers: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { questionKey: true, promptSnapshot: true, answer: true },
        },
      },
    });

    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }
    if (!EDITABLE_CHARACTER_STATUSES.has(character.sheetStatus)) {
      throw new AppError(409, "Personagem nao pode solicitar preenchimento neste estado.", "CHARACTER_NOT_EDITABLE");
    }
    if (character.sheetRevision !== input.expectedRevision) {
      throw new AppError(409, "Revisao esperada nao corresponde ao rascunho atual.", "STALE_CHARACTER_REVISION");
    }

    const builderConfig = BuilderService.getConfig(character.builderConfigVersion);
    const context = {
      targetChapter: input.targetChapter,
      targetFields: normalizedFields,
      playerIntent: input.playerIntent ?? null,
      experiencePurpose: {
        game: "Guardian of Bravantus",
        playerGoal: "Criar uma pessoa marcada com identidade, motivacao, vinculos e escolhas proprias.",
        masterGoal: "Receber ganchos abertos para conectar o personagem a aventura sem transformar sugestoes em fatos obrigatorios.",
        boundaries: [
          "Nao exigir ligacao previa com pessoas, lugares ou acontecimentos especificos do episodio.",
          "Nao resolver o arco do personagem durante a criacao.",
          "Nao substituir a decisao do jogador ou do Mestre.",
        ],
      },
      table: { id: table.id, name: table.name },
      contextVersion: {
        id: table.contextVersion.id,
        version: table.contextVersion.version,
        layer: table.contextVersion.layer,
      },
      publicContext: table.contextVersion.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        classification: unit.classification,
        visibility: unit.visibility,
        content: unit.content,
      })),
      builder: {
        version: builderConfig.version,
        aiBoundaries: builderConfig.aiBoundaries,
        fieldRules: this.pickFieldRules(normalizedFields, builderConfig.version),
      },
      character: {
        id: character.id,
        sheetStatus: character.sheetStatus,
        sheetRevision: character.sheetRevision,
        fields: this.pickCharacterFields(character),
        narrativeResponses: character.narrativeResponses,
        confirmedNarrativeContext: character.confirmedNarrativeContext,
        playStylePreference: character.playStylePreference,
        episodeAnswers: character.episodeAnswers.map((answer) => ({
          questionKey: answer.questionKey,
          promptSnapshot: answer.promptSnapshot,
          answer: answer.answer,
        })),
      },
      sourceRefs: [
        ...table.contextVersion.units.map((unit) => ({
          type: "CONTEXT_UNIT" as const,
          id: unit.id,
          contextVersionId: table.contextVersion.id,
        })),
        { type: "CHARACTER" as const, id: character.id, revision: character.sheetRevision },
        ...character.episodeAnswers.map((answer) => ({
          type: "EPISODE_ANSWER" as const,
          questionKey: answer.questionKey,
        })),
      ],
    };

    this.assertSecretSafe(context);
    return {
      context,
      targetFields: normalizedFields,
      characterRevision: character.sheetRevision,
      contextVersionId: table.contextVersion.id,
      contextHash: this.hashAuthorizedContext(context),
    };
  }

  static async buildAuthorizedMechanicalProposalContext(input: {
    authenticatedUserId: string;
    tableId: string;
    characterId: string;
    expectedRevision: number;
  }) {
    const authorized = await this.buildAuthorizedCharacterBuilderContext({
      ...input,
      targetChapter: "STORY",
      targetFields: ["concept", "desire", "markAttitude"],
      playerIntent: "Gerar proposta mecanica sem aplicar alteracoes.",
    });
    const character = authorized.context.character;
    const config = BuilderService.getConfig(authorized.context.builder.version);
    const responses = character.narrativeResponses && typeof character.narrativeResponses === "object"
      ? character.narrativeResponses as Record<string, unknown>
      : {};
    const confirmed = character.confirmedNarrativeContext && typeof character.confirmedNarrativeContext === "object"
      ? character.confirmedNarrativeContext as Record<string, unknown>
      : {};
    const confirmedBlocks = Array.isArray(confirmed.confirmedBlocks)
      ? confirmed.confirmedBlocks.map(String)
      : [];
    const hasRequiredNarrative = Boolean(
      config.narrativeFlow
      && config.narrativeFlow.questions.every((question) => responses[question.key])
      && config.narrativeFlow.confirmationBlocks.every((block) => confirmedBlocks.includes(block))
    );

    if (!hasRequiredNarrative || !character.playStylePreference) {
      throw new AppError(
        400,
        "Confirme a interpretacao narrativa e a preferencia de jogo antes da proposta.",
        "CONFIRMED_NARRATIVE_CONTEXT_REQUIRED"
      );
    }
    return authorized;
  }

  private static pickFieldRules(targetFields: string[], builderConfigVersion?: string) {
    const config = builderConfigVersion
      ? BuilderService.getConfig(builderConfigVersion)
      : BuilderService.getActiveConfig();
    const rules: Record<string, unknown> = {};
    for (const field of targetFields) {
      if (["positiveTrait", "negativeTrait", "narrativeBond"].includes(field)) {
        rules[field] = config.traitsAndBond;
      } else if (field === "initialEquipment") {
        rules[field] = config.equipment;
      } else if (field.startsWith("mark")) {
        rules[field] = config.aiBoundaries;
      } else {
        rules[field] = "Campo narrativo textual. Sugira redacao curta sem declarar canon secreto.";
      }
    }
    return rules;
  }

  private static pickCharacterFields(character: Record<string, unknown>) {
    const fields: Record<string, unknown> = {};
    for (const field of ALLOWED_CHARACTER_AI_FIELDS) {
      fields[field] = character[field] ?? null;
    }
    fields.archetypeKey = character.archetypeKey ?? null;
    return fields;
  }

  private static hashAuthorizedContext(value: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
