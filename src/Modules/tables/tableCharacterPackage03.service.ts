import {
  CharacterReviewAction,
  CharacterReviewStatus,
  CharacterSheetStatus,
  Prisma,
  TableMemberRole,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import { TableAuthorizationService } from "./tableAuthorization.service";
import {
  CharacterEpisodeAnswerInput,
  CharacterSheetInput,
  ReviewCharacterInput,
} from "./table.types";

type CharacterDb = typeof defaultPrisma;

const editableStatuses = new Set<CharacterSheetStatus>([
  CharacterSheetStatus.DRAFT,
  CharacterSheetStatus.CHANGES_REQUESTED,
]);

const characterInclude = {
  episodeAnswers: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  reviewEvents: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  approvedBy: { select: { id: true, nome: true, email: true } },
  user: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.CharacterInclude;

export class TableCharacterPackage03Service {
  private static db: CharacterDb = defaultPrisma;

  static setDbForTests(db: CharacterDb): void {
    this.db = db;
    TableAuthorizationService.setDbForTests(db);
  }

  static resetDbForTests(): void {
    this.db = defaultPrisma;
    TableAuthorizationService.resetDbForTests();
  }

  static async createDraft(userId: string, tableId: string, input: CharacterSheetInput) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    if (membership.role !== TableMemberRole.PLAYER) {
      throw new AppError(403, "Somente PLAYER ativo pode criar personagem proprio.", "TABLE_PLAYER_REQUIRED");
    }

    const legacyClass = await this.findLegacyClassForDraft();
    const data = this.normalizeSheetData(input, { partial: true });
    const character = await this.db.character.create({
      data: {
        ...data,
        name: data.name ?? "",
        userId,
        tableId,
        classId: legacyClass.id,
        sheetStatus: CharacterSheetStatus.DRAFT,
        sheetRevision: 1,
      },
      include: characterInclude,
    });

    return this.formatCharacter(character);
  }

  static async getMyCharacter(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMember(tableId, userId);
    const character = await this.db.character.findFirst({
      where: { tableId, userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: characterInclude,
    });

    return character ? this.formatCharacter(character) : null;
  }

  static async getCharacter(userId: string, tableId: string, characterId: string) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    const character = await this.findTableCharacter(tableId, characterId);
    this.assertCanRead(character, membership.role, userId);
    return this.formatCharacter(character);
  }

  static async updateDraft(userId: string, tableId: string, characterId: string, input: CharacterSheetInput) {
    await this.ensureEditableOwner(userId, tableId, characterId);
    const data = this.normalizeSheetData(input, { partial: true });

    const character = await this.db.character.update({
      where: { id: characterId },
      data: {
        ...data,
        sheetRevision: { increment: 1 },
      },
      include: characterInclude,
    });

    return this.formatCharacter(character);
  }

  static async upsertEpisodeAnswers(
    userId: string,
    tableId: string,
    characterId: string,
    answers: CharacterEpisodeAnswerInput[]
  ) {
    await this.ensureEditableOwner(userId, tableId, characterId);

    const character = await this.db.$transaction(async (tx) => {
      for (const answer of answers) {
        const promptSnapshot = BuilderService.buildEpisodeQuestionSnapshot(answer.questionKey);

        await tx.characterEpisodeAnswer.upsert({
          where: {
            characterId_questionKey: {
              characterId,
              questionKey: answer.questionKey,
            },
          },
          create: {
            characterId,
            questionKey: answer.questionKey,
            promptSnapshot,
            answer: answer.answer,
          },
          update: {
            promptSnapshot,
            answer: answer.answer,
          },
        });
      }

      await tx.character.update({
        where: { id: characterId },
        data: { sheetRevision: { increment: 1 } },
      });

      return tx.character.findUniqueOrThrow({ where: { id: characterId }, include: characterInclude });
    });

    return this.formatCharacter(character);
  }

  static async submit(userId: string, tableId: string, characterId: string) {
    await this.ensureEditableOwner(userId, tableId, characterId);
    const current = await this.findTableCharacter(tableId, characterId);
    this.assertReadyForSubmission(current);
    if (current.sheetStatus === CharacterSheetStatus.APPROVED || current.sheetStatus === CharacterSheetStatus.SUBMITTED) {
      throw new AppError(409, "Transicao de personagem invalida.", "INVALID_CHARACTER_TRANSITION");
    }

    const now = new Date();
    const character = await this.db.character.update({
      where: { id: characterId },
      data: {
        sheetStatus: CharacterSheetStatus.SUBMITTED,
        submittedAt: now,
        submittedRevision: current.sheetRevision,
      },
      include: characterInclude,
    });

    await this.db.characterReview.upsert({
      where: { tableId_characterId: { tableId, characterId } },
      create: {
        tableId,
        characterId,
        status: CharacterReviewStatus.PENDING,
      },
      update: {
        status: CharacterReviewStatus.PENDING,
        masterFeedback: null,
      },
    });

    return this.formatCharacter(character);
  }

  static async listReviewQueue(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMaster(tableId, userId);
    const characters = await this.db.character.findMany({
      where: {
        tableId,
        sheetStatus: { in: [CharacterSheetStatus.SUBMITTED, CharacterSheetStatus.APPROVED] },
      },
      include: characterInclude,
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    });

    return characters.map((character) => this.formatCharacter(character));
  }

  static async listReviewEvents(userId: string, tableId: string, characterId: string) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    const character = await this.findTableCharacter(tableId, characterId);
    this.assertCanRead(character, membership.role, userId);

    return this.db.characterReviewEvent.findMany({
      where: { characterId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  static async requestChanges(userId: string, tableId: string, characterId: string, input: ReviewCharacterInput) {
    if (!input.reason) {
      throw new AppError(400, "Motivo de alteracao e obrigatorio.", "CHARACTER_REVIEW_REASON_REQUIRED");
    }

    return this.reviewSubmittedCharacter({
      userId,
      tableId,
      characterId,
      expectedRevision: input.expectedRevision,
      action: CharacterReviewAction.CHANGES_REQUESTED,
      reason: input.reason,
    });
  }

  static async approve(userId: string, tableId: string, characterId: string, input: ReviewCharacterInput) {
    return this.reviewSubmittedCharacter({
      userId,
      tableId,
      characterId,
      expectedRevision: input.expectedRevision,
      action: CharacterReviewAction.APPROVED,
      reason: input.reason,
    });
  }

  private static async reviewSubmittedCharacter(input: {
    userId: string;
    tableId: string;
    characterId: string;
    expectedRevision?: number;
    action: CharacterReviewAction;
    reason?: string;
  }) {
    await TableAuthorizationService.requireTableMaster(input.tableId, input.userId);
    const existing = await this.findTableCharacter(input.tableId, input.characterId);
    if (existing.userId === input.userId) {
      throw new AppError(403, "Mestre nao pode revisar o proprio personagem.", "CHARACTER_SELF_REVIEW_FORBIDDEN");
    }
    if (existing.sheetStatus !== CharacterSheetStatus.SUBMITTED || !existing.submittedRevision) {
      throw new AppError(409, "Personagem nao esta submetido para revisao.", "CHARACTER_NOT_SUBMITTED");
    }

    const revision = input.expectedRevision ?? existing.submittedRevision;
    if (revision !== existing.submittedRevision) {
      throw new AppError(409, "Revisao esperada nao corresponde a submissao atual.", "STALE_CHARACTER_REVIEW");
    }

    const result = await this.db.$transaction(async (tx) => {
      const updated = await tx.character.updateMany({
        where: {
          id: input.characterId,
          tableId: input.tableId,
          sheetStatus: CharacterSheetStatus.SUBMITTED,
          submittedRevision: revision,
        },
        data:
          input.action === CharacterReviewAction.APPROVED
            ? {
                sheetStatus: CharacterSheetStatus.APPROVED,
                approvedAt: new Date(),
                approvedById: input.userId,
              }
            : {
                sheetStatus: CharacterSheetStatus.CHANGES_REQUESTED,
              },
      });

      if (updated.count !== 1) {
        throw new AppError(409, "Revisao concorrente ou estado desatualizado.", "STALE_CHARACTER_REVIEW");
      }

      await tx.characterReviewEvent.create({
        data: {
          characterId: input.characterId,
          reviewerUserId: input.userId,
          action: input.action,
          reason: input.reason ?? null,
          characterRevisionReviewed: revision,
        },
      });

      await tx.characterReview.upsert({
        where: { tableId_characterId: { tableId: input.tableId, characterId: input.characterId } },
        create: {
          tableId: input.tableId,
          characterId: input.characterId,
          status:
            input.action === CharacterReviewAction.APPROVED
              ? CharacterReviewStatus.APPROVED
              : CharacterReviewStatus.NEEDS_CHANGES,
          masterFeedback: input.reason ?? null,
        },
        update: {
          status:
            input.action === CharacterReviewAction.APPROVED
              ? CharacterReviewStatus.APPROVED
              : CharacterReviewStatus.NEEDS_CHANGES,
          masterFeedback: input.reason ?? null,
        },
      });

      return tx.character.findUniqueOrThrow({ where: { id: input.characterId }, include: characterInclude });
    });

    return this.formatCharacter(result);
  }

  private static async ensureEditableOwner(userId: string, tableId: string, characterId: string) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    if (membership.role !== TableMemberRole.PLAYER) {
      throw new AppError(403, "Somente o PLAYER dono pode editar personagem.", "TABLE_PLAYER_REQUIRED");
    }

    const character = await this.findTableCharacter(tableId, characterId);
    if (character.userId !== userId) {
      throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }
    if (!editableStatuses.has(character.sheetStatus)) {
      throw new AppError(409, "Personagem nao pode ser editado neste estado.", "CHARACTER_NOT_EDITABLE");
    }

    return character;
  }

  private static async findTableCharacter(tableId: string, characterId: string) {
    const character = await this.db.character.findFirst({
      where: { id: characterId, tableId },
      include: characterInclude,
    });
    if (!character) {
      throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
    }

    return character;
  }

  private static assertCanRead(
    character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>,
    role: TableMemberRole,
    userId: string
  ) {
    if (character.userId === userId) {
      return;
    }
    if (role === TableMemberRole.MASTER && character.sheetStatus !== CharacterSheetStatus.DRAFT) {
      return;
    }

    throw new AppError(404, "Personagem nao encontrado.", "TABLE_CHARACTER_NOT_FOUND");
  }

  private static assertReadyForSubmission(character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>) {
    const missing = [
      ["name", character.name],
      ["concept", character.concept],
      ["origin", character.origin],
      ["appearance", character.appearance],
      ["desire", character.desire],
      ["fear", character.fear],
      ["promiseOrGuilt", character.promiseOrGuilt],
      ["reasonToActWithGroup", character.reasonToActWithGroup],
      ["markLocation", character.markLocation],
      ["markAppearance", character.markAppearance],
      ["markReaction", character.markReaction],
      ["markAttitude", character.markAttitude],
      ["archetypeKey", character.archetypeKey],
      ["attributes", character.attributes],
      ["trainings", character.trainings],
      ["positiveTrait", character.positiveTrait],
      ["negativeTrait", character.negativeTrait],
      ["narrativeBond", character.narrativeBond],
      ["personalHistory", character.personalHistory],
      ["initialEquipment", character.initialEquipment],
      ...BuilderService.getRequiredEpisodeQuestionKeys().map((questionKey) => [
        `episodeAnswers.${questionKey}`,
        character.episodeAnswers.some((answer) => answer.questionKey === questionKey) ? "ok" : null,
      ]),
    ].filter((entry) => entry[1] === null || entry[1] === undefined || entry[1] === "");

    if (missing.length) {
      throw new AppError(
        400,
        "Ficha incompleta para submissao.",
        "CHARACTER_SHEET_INCOMPLETE",
        { missingFields: missing.map((entry) => entry[0]) }
      );
    }
  }

  private static normalizeSheetData(input: CharacterSheetInput, options: { partial: boolean }) {
    return {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.concept !== undefined ? { concept: input.concept } : {}),
      ...(input.origin !== undefined ? { origin: input.origin } : {}),
      ...(input.appearance !== undefined ? { appearance: input.appearance } : {}),
      ...(input.desire !== undefined ? { desire: input.desire } : {}),
      ...(input.fear !== undefined ? { fear: input.fear } : {}),
      ...(input.promiseOrGuilt !== undefined ? { promiseOrGuilt: input.promiseOrGuilt } : {}),
      ...(input.reasonToActWithGroup !== undefined ? { reasonToActWithGroup: input.reasonToActWithGroup } : {}),
      ...(input.markLocation !== undefined ? { markLocation: input.markLocation } : {}),
      ...(input.markAppearance !== undefined ? { markAppearance: input.markAppearance } : {}),
      ...(input.markReaction !== undefined ? { markReaction: input.markReaction } : {}),
      ...(input.markAttitude !== undefined ? { markAttitude: input.markAttitude } : {}),
      ...(input.archetypeKey !== undefined ? { archetypeKey: BuilderService.normalizeArchetypeKey(input.archetypeKey) } : {}),
      ...(input.attributes !== undefined ? { attributes: BuilderService.normalizeAttributes(input.attributes) } : {}),
      ...(input.trainings !== undefined ? { trainings: BuilderService.normalizeTrainings(input.trainings) } : {}),
      ...(input.positiveTrait !== undefined ? { positiveTrait: this.normalizeTrait(input.positiveTrait, "positiveTrait") } : {}),
      ...(input.negativeTrait !== undefined ? { negativeTrait: this.normalizeTrait(input.negativeTrait, "negativeTrait") } : {}),
      ...(input.narrativeBond !== undefined ? { narrativeBond: input.narrativeBond } : {}),
      ...(input.personalHistory !== undefined ? { personalHistory: input.personalHistory } : {}),
      ...(input.initialEquipment !== undefined ? { initialEquipment: this.normalizeEquipment(input.initialEquipment) } : {}),
    };
  }

  private static async findLegacyClassForDraft() {
    const legacyClass = await this.db.class.findFirst({
      where: { tier: 1, evolvesFrom: null },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    if (!legacyClass) {
      throw new AppError(
        400,
        "Nenhuma classe base legada cadastrada para compatibilidade tecnica do rascunho.",
        "CLASS_REQUIRED"
      );
    }

    return legacyClass;
  }

  private static normalizeAttributes(value: unknown): Prisma.InputJsonValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AppError(400, "attributes deve ser objeto com seis atributos.", "INVALID_CHARACTER_ATTRIBUTES");
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length !== 6) {
      throw new AppError(400, "attributes deve conter exatamente seis atributos.", "INVALID_CHARACTER_ATTRIBUTES");
    }

    const normalized: Record<string, number> = {};
    for (const [key, rawValue] of entries) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
        throw new AppError(400, "Nome de atributo desconhecido ou inseguro.", "UNKNOWN_ATTRIBUTE_NAME");
      }
      if (typeof rawValue !== "number" || !Number.isInteger(rawValue) || rawValue < 0 || rawValue > 20) {
        throw new AppError(400, "Valor de atributo invalido.", "INVALID_CHARACTER_ATTRIBUTES");
      }
      normalized[key] = rawValue;
    }

    return normalized;
  }

  private static normalizeTrainings(value: unknown): Prisma.InputJsonValue {
    if (!Array.isArray(value) || value.length !== 3) {
      throw new AppError(400, "trainings deve conter exatamente tres treinos.", "INVALID_CHARACTER_TRAININGS");
    }
    const normalized = value.map((entry) => {
      if (typeof entry !== "string" || !/^[a-z0-9][a-z0-9- ]{1,79}$/i.test(entry.trim())) {
        throw new AppError(400, "Treino invalido.", "INVALID_CHARACTER_TRAININGS");
      }
      return entry.trim();
    });
    const keys = normalized.map((entry) => entry.toLowerCase());
    if (new Set(keys).size !== keys.length) {
      throw new AppError(409, "Treinos duplicados nao sao permitidos.", "DUPLICATE_CHARACTER_TRAINING");
    }

    return normalized;
  }

  private static normalizeTrait(value: unknown, fieldName: string): Prisma.InputJsonValue {
    if (typeof value === "string") {
      return { text: value.trim() };
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AppError(400, `${fieldName} invalido.`, "INVALID_CHARACTER_TRAIT");
    }
    this.assertNoDerivedFields(value as Record<string, unknown>);
    return value as Prisma.InputJsonObject;
  }

  private static normalizeEquipment(value: unknown): Prisma.InputJsonValue {
    BuilderService.validateInitialEquipment(value);

    if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
      throw new AppError(400, "initialEquipment deve ser lista com 1 a 10 itens.", "INVALID_CHARACTER_EQUIPMENT");
    }

    return value.map((entry) => {
      if (typeof entry === "string") {
        return { text: entry.trim() };
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new AppError(400, "Equipamento inicial invalido.", "INVALID_CHARACTER_EQUIPMENT");
      }
      const object = entry as Record<string, unknown>;
      this.assertNoDerivedFields(object);
      if (typeof object.name !== "string" || object.name.trim().length < 1) {
        throw new AppError(400, "Equipamento inicial exige name.", "INVALID_CHARACTER_EQUIPMENT");
      }
      return object as Prisma.InputJsonObject;
    });
  }

  private static assertNoDerivedFields(value: Record<string, unknown>): void {
    for (const key of Object.keys(value)) {
      if (/^derived|total|final/i.test(key)) {
        throw new AppError(400, "Totais derivados nao podem ser enviados pelo cliente.", "FORGED_DERIVED_VALUES");
      }
    }
  }

  private static formatCharacter(character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>) {
    return {
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
      derivedResources: BuilderService.calculateDerivedResources(character.attributes),
      sheetStatus: character.sheetStatus,
      sheetRevision: character.sheetRevision,
      submittedRevision: character.submittedRevision,
      submittedAt: character.submittedAt,
      approvedAt: character.approvedAt,
      approvedBy: character.approvedBy,
      episodeAnswers: character.episodeAnswers.map((answer) => ({
        id: answer.id,
        questionKey: answer.questionKey,
        promptSnapshot: answer.promptSnapshot,
        answer: answer.answer,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      })),
      reviewEvents: character.reviewEvents.map((event) => ({
        id: event.id,
        action: event.action,
        reason: event.reason,
        characterRevisionReviewed: event.characterRevisionReviewed,
        reviewerUserId: event.reviewerUserId,
        createdAt: event.createdAt,
      })),
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  }
}
