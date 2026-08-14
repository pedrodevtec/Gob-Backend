import {
  AccountRole,
  CharacterReviewAction,
  CharacterReviewStatus,
  CharacterSheetStatus,
  Prisma,
  TableMemberRole,
} from "@prisma/client";
import defaultPrisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import {
  PlaytestNotificationKind,
  sendPlaytestNotificationSafely,
} from "../notifications/playtestNotification.sender";
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
  table: {
    select: {
      contextVersionId: true,
      publicCampaign: { select: { builderConfigVersion: true, title: true } },
    },
  },
  reviews: { orderBy: { updatedAt: "desc" }, take: 1 },
  submissionSnapshots: { orderBy: [{ submittedAt: "desc" }, { id: "desc" }] },
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
    const account = await this.db.user.findUnique({ where: { id: userId }, select: { accountRole: true } });
    if (membership.role !== TableMemberRole.PLAYER && account?.accountRole !== AccountRole.ADMIN) {
      throw new AppError(403, "Somente PLAYER ativo pode criar personagem proprio.", "TABLE_PLAYER_REQUIRED");
    }

    const legacyClass = await this.findLegacyClassForDraft();
    const builderConfigVersion = BuilderService.getActiveConfig().version;
    const data = this.normalizeSheetData(input, { partial: true, builderConfigVersion });
    const character = await this.db.character.create({
      data: {
        ...data,
        name: data.name ?? "",
        userId,
        tableId,
        classId: legacyClass.id,
        builderConfigVersion,
        sheetStatus: CharacterSheetStatus.DRAFT,
        sheetRevision: 1,
      },
      include: characterInclude,
    });

    return this.formatCharacter(character);
  }

  static async getMyCharacter(userId: string, tableId: string) {
    await TableAuthorizationService.requireTableMember(tableId, userId);
    let character = await this.db.character.findFirst({
      where: { tableId, userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: characterInclude,
    });

    if (character && this.isUnstartedOutdatedDraft(character)) {
      character = await this.db.character.update({
        where: { id: character.id },
        data: { builderConfigVersion: BuilderService.getActiveConfig().version },
        include: characterInclude,
      });
    }

    return character ? this.formatCharacter(character) : null;
  }

  static async getCharacter(userId: string, tableId: string, characterId: string) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    const character = await this.findTableCharacter(tableId, characterId);
    this.assertCanRead(character, membership.role, userId);
    return this.formatCharacter(character);
  }

  static async updateDraft(userId: string, tableId: string, characterId: string, input: CharacterSheetInput) {
    const current = await this.ensureEditableOwner(userId, tableId, characterId);
    const data = this.normalizeSheetData(input, {
      partial: true,
      builderConfigVersion: current.builderConfigVersion,
    });

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
    const current = await this.ensureEditableOwner(userId, tableId, characterId);

    const character = await this.db.$transaction(async (tx) => {
      for (const answer of answers) {
        const promptSnapshot = BuilderService.buildEpisodeQuestionSnapshot(
          answer.questionKey,
          current.builderConfigVersion
        );

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
    const submittedRevision = current.sheetRevision;
    const character = await this.db.$transaction(async (tx) => {
      await tx.characterSubmissionSnapshot.create({
        data: this.buildSubmissionSnapshotData(current, {
          submittedById: userId,
          submittedAt: now,
          sheetRevision: submittedRevision,
        }),
      });

      const updated = await tx.character.update({
        where: { id: characterId },
        data: {
          sheetStatus: CharacterSheetStatus.SUBMITTED,
          submittedAt: now,
          submittedRevision,
        },
        include: characterInclude,
      });

      await tx.characterReview.upsert({
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

      return updated;
    });

    await this.notifyCharacterOwner(character, "CHARACTER_SUBMITTED");
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

  static async adaptLegacyCharacter(adminUserId: string, tableId: string, characterId: string) {
    await this.requireAdminAccount(adminUserId);
    const current = await this.findTableCharacter(tableId, characterId);
    if (current.narrativeResponses || current.confirmedNarrativeContext) {
      throw new AppError(409, "Personagem ja usa o modelo atual.", "CHARACTER_ALREADY_CURRENT");
    }

    const sourceSnapshot = {
      name: current.name,
      concept: current.concept,
      origin: current.origin,
      appearance: current.appearance,
      desire: current.desire,
      fear: current.fear,
      promiseOrGuilt: current.promiseOrGuilt,
      reasonToActWithGroup: current.reasonToActWithGroup,
      markLocation: current.markLocation,
      markAppearance: current.markAppearance,
      markReaction: current.markReaction,
      markAttitude: current.markAttitude,
      narrativeBond: current.narrativeBond,
      personalHistory: current.personalHistory,
      creativeDossier: current.creativeDossier,
      sheetStatus: current.sheetStatus,
      sheetRevision: current.sheetRevision,
    } satisfies Prisma.InputJsonObject;
    const fields = Object.fromEntries(
      Object.entries(sourceSnapshot).filter(([, value]) => typeof value === "string" && value.trim())
    ) as Record<string, string>;
    const activeVersion = BuilderService.getActiveConfig().version;

    const adapted = await this.db.$transaction(async (tx) => {
      await tx.characterLegacyAdaptation.create({
        data: { characterId, adminUserId, sourceSnapshot },
      });
      await tx.character.update({
        where: { id: characterId },
        data: {
          builderConfigVersion: activeVersion,
          narrativeResponses: {
            before_mark: current.personalHistory || current.concept || "História anterior preservada para revisão.",
            motivation_and_bonds: [current.desire, current.narrativeBond, current.reasonToActWithGroup]
              .filter(Boolean)
              .join(" ") || "Motivações preservadas para revisão.",
            mark_change: [current.markAppearance, current.markReaction, current.markAttitude]
              .filter(Boolean)
              .join(" ") || "Relação com a Marca preservada para revisão.",
          },
          confirmedNarrativeContext: { confirmedBlocks: [], fields },
          playStylePreference: null,
          sheetStatus: CharacterSheetStatus.DRAFT,
          submittedRevision: null,
          submittedAt: null,
          approvedAt: null,
          approvedById: null,
          sheetRevision: { increment: 1 },
        },
      });
      return tx.character.findUniqueOrThrow({ where: { id: characterId }, include: characterInclude });
    });
    return this.formatCharacter(adapted);
  }

  static async deleteCharacterAsAdmin(
    adminUserId: string,
    tableId: string,
    characterId: string,
    reason: string
  ) {
    await this.requireAdminAccount(adminUserId);
    const character = await this.findTableCharacter(tableId, characterId);

    await this.db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { characterId } });
      await tx.characterActionLog.deleteMany({ where: { characterId } });
      await tx.characterReview.deleteMany({ where: { characterId } });
      await tx.characterTrait.deleteMany({ where: { characterId } });
      await tx.characterTraitSuggestion.deleteMany({ where: { characterId } });
      await tx.tableMissionSubmission.deleteMany({ where: { characterId } });
      await tx.playerAiSuggestion.deleteMany({ where: { characterId } });
      await tx.aiUsageEvent.updateMany({ where: { characterId }, data: { characterId: null } });
      await tx.analyticsEvent.updateMany({ where: { characterId }, data: { characterId: null } });
      if (character.inventoryId) {
        await tx.item.deleteMany({ where: { inventoryId: character.inventoryId } });
        await tx.equipment.deleteMany({ where: { inventoryId: character.inventoryId } });
        await tx.character.update({ where: { id: characterId }, data: { inventoryId: null } });
        await tx.inventory.delete({ where: { id: character.inventoryId } });
      }
      await tx.character.delete({ where: { id: characterId } });
      await tx.analyticsEvent.create({
        data: {
          eventKey: "admin_character_deleted",
          userId: adminUserId,
          tableId,
          source: "pilot_admin",
          metadata: { deletedCharacterId: characterId, ownerUserId: character.userId, reason },
        },
      });
    });
    return { deleted: true, characterId };
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

      if (input.action === CharacterReviewAction.APPROVED) {
        const approvalDate = new Date();
        const snapshotUpdate = await tx.characterSubmissionSnapshot.updateMany({
          where: {
            characterId: input.characterId,
            sheetRevision: revision,
            approvedAt: null,
          },
          data: {
            approvedAt: approvalDate,
            approvedById: input.userId,
          },
        });

        if (snapshotUpdate.count !== 1) {
          throw new AppError(409, "Snapshot da submissao nao encontrado ou ja aprovado.", "CHARACTER_SUBMISSION_SNAPSHOT_NOT_FOUND");
        }
      }

      return tx.character.findUniqueOrThrow({ where: { id: input.characterId }, include: characterInclude });
    });

    await this.notifyCharacterOwner(
      result,
      input.action === CharacterReviewAction.APPROVED
        ? "CHARACTER_APPROVED"
        : "CHARACTER_CHANGES_REQUESTED",
      input.reason
    );
    return this.formatCharacter(result);
  }

  private static async notifyCharacterOwner(
    character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>,
    kind: PlaytestNotificationKind,
    masterFeedback?: string
  ): Promise<void> {
    const campaign = character.table?.publicCampaign;
    if (!campaign || !character.user.email) {
      return;
    }

    const baseUrl = env.APP_WEB_URL.replace(/\/$/, "");
    await sendPlaytestNotificationSafely({
      kind,
      to: character.user.email,
      playerName: character.user.nome,
      characterName: character.name || "seu personagem",
      campaignTitle: campaign.title,
      actionUrl: `${baseUrl}/dashboard`,
      masterFeedback,
    });
  }

  private static async requireAdminAccount(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { accountRole: true } });
    if (user?.accountRole !== AccountRole.ADMIN) {
      throw new AppError(403, "Ação restrita ao administrador.", "ADMIN_REQUIRED");
    }
  }

  private static async ensureEditableOwner(userId: string, tableId: string, characterId: string) {
    const membership = await TableAuthorizationService.requireTableMember(tableId, userId);
    const account = await this.db.user.findUnique({ where: { id: userId }, select: { accountRole: true } });
    if (membership.role !== TableMemberRole.PLAYER && account?.accountRole !== AccountRole.ADMIN) {
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
    const config = BuilderService.getConfig(character.builderConfigVersion);
    const mechanicalEntries: Array<[string, unknown]> = [
      ["archetypeKey", character.archetypeKey],
      ["attributes", character.attributes],
      ["trainings", character.trainings],
      ["positiveTrait", character.positiveTrait],
      ["negativeTrait", character.negativeTrait],
      ["initialEquipment", character.initialEquipment],
    ];
    let requiredEntries: Array<[string, unknown]>;

    if (config.narrativeFlow) {
      const responses = this.jsonRecord(character.narrativeResponses);
      const confirmed = this.jsonRecord(character.confirmedNarrativeContext);
      const confirmedFields = this.jsonRecord(confirmed.fields);
      const confirmedBlocks = Array.isArray(confirmed.confirmedBlocks)
        ? confirmed.confirmedBlocks.map(String)
        : [];
      requiredEntries = [
        ...config.narrativeFlow.questions.map((question) => [
          `narrativeResponses.${question.key}`,
          responses[question.key],
        ] as [string, unknown]),
        ...config.narrativeFlow.confirmationBlocks.map((block) => [
          `confirmedNarrativeContext.${block}`,
          confirmedBlocks.includes(block) ? "ok" : null,
        ] as [string, unknown]),
        ...config.narrativeFlow.requiredConfirmedFields.map((field) => [
          field,
          confirmedFields[field] ?? character[field as keyof typeof character],
        ] as [string, unknown]),
        ["playStylePreference", character.playStylePreference],
        ...mechanicalEntries,
      ];
    } else {
      requiredEntries = [
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
        ["narrativeBond", character.narrativeBond],
        ["personalHistory", character.personalHistory],
        ...mechanicalEntries,
        ...BuilderService.getRequiredEpisodeQuestionKeys(character.builderConfigVersion).map((questionKey) => [
          `episodeAnswers.${questionKey}`,
          character.episodeAnswers.some((answer) => answer.questionKey === questionKey) ? "ok" : null,
        ] as [string, unknown]),
      ];
    }

    const missing = requiredEntries.filter((entry) =>
      entry[1] === null || entry[1] === undefined || entry[1] === ""
    );

    if (missing.length) {
      throw new AppError(
        400,
        "Ficha incompleta para submissao.",
        "CHARACTER_SHEET_INCOMPLETE",
        { missingFields: missing.map((entry) => entry[0]) }
      );
    }

    BuilderService.normalizeArchetypeKey(character.archetypeKey!, character.builderConfigVersion);
    BuilderService.normalizeAttributes(character.attributes, character.builderConfigVersion);
    BuilderService.normalizeTrainings(character.trainings, character.builderConfigVersion);
    this.normalizeTrait(character.positiveTrait, "positiveTrait");
    this.normalizeTrait(character.negativeTrait, "negativeTrait");
    this.normalizeEquipment(character.initialEquipment, character.builderConfigVersion);
  }

  private static jsonRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private static isUnstartedOutdatedDraft(
    character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>
  ): boolean {
    const activeVersion = BuilderService.getActiveConfig().version;
    const textFields = [
      character.name,
      character.concept,
      character.origin,
      character.appearance,
      character.desire,
      character.fear,
      character.promiseOrGuilt,
      character.reasonToActWithGroup,
      character.markLocation,
      character.markAppearance,
      character.markReaction,
      character.markAttitude,
      character.narrativeBond,
      character.personalHistory,
      character.playStylePreference,
    ];
    const jsonFields = [
      character.attributes,
      character.trainings,
      character.positiveTrait,
      character.negativeTrait,
      character.initialEquipment,
      character.creativeDossier,
      character.narrativeResponses,
      character.confirmedNarrativeContext,
    ];

    return (
      character.builderConfigVersion !== activeVersion &&
      character.sheetStatus === CharacterSheetStatus.DRAFT &&
      character.sheetRevision === 1 &&
      character.submittedAt === null &&
      character.approvedAt === null &&
      textFields.every((value) => value === null || value.trim() === "") &&
      character.archetypeKey === null &&
      jsonFields.every((value) => value === null) &&
      character.episodeAnswers.length === 0 &&
      character.reviews.length === 0 &&
      character.reviewEvents.length === 0 &&
      character.submissionSnapshots.length === 0
    );
  }

  private static normalizeSheetData(
    input: CharacterSheetInput,
    options: { partial: boolean; builderConfigVersion: string }
  ) {
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
      ...(input.archetypeKey !== undefined ? { archetypeKey: BuilderService.normalizeArchetypeKey(input.archetypeKey, options.builderConfigVersion) } : {}),
      ...(input.attributes !== undefined ? { attributes: BuilderService.normalizeAttributes(input.attributes, options.builderConfigVersion) } : {}),
      ...(input.trainings !== undefined ? { trainings: BuilderService.normalizeTrainings(input.trainings, options.builderConfigVersion) } : {}),
      ...(input.positiveTrait !== undefined ? { positiveTrait: this.normalizeTrait(input.positiveTrait, "positiveTrait") } : {}),
      ...(input.negativeTrait !== undefined ? { negativeTrait: this.normalizeTrait(input.negativeTrait, "negativeTrait") } : {}),
      ...(input.narrativeBond !== undefined ? { narrativeBond: input.narrativeBond } : {}),
      ...(input.personalHistory !== undefined ? { personalHistory: input.personalHistory } : {}),
      ...(input.initialEquipment !== undefined ? { initialEquipment: this.normalizeEquipment(input.initialEquipment, options.builderConfigVersion) } : {}),
      ...(input.creativeDossier !== undefined ? { creativeDossier: input.creativeDossier } : {}),
      ...(input.narrativeResponses !== undefined
        ? { narrativeResponses: this.normalizeNarrativeResponses(input.narrativeResponses) }
        : {}),
      ...(input.confirmedNarrativeContext !== undefined
        ? { confirmedNarrativeContext: this.normalizeConfirmedNarrativeContext(input.confirmedNarrativeContext) }
        : {}),
      ...(input.playStylePreference !== undefined
        ? { playStylePreference: this.normalizePlayStylePreference(input.playStylePreference, options.builderConfigVersion) }
        : {}),
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

  private static normalizeEquipment(value: unknown, builderConfigVersion: string): Prisma.InputJsonValue {
    BuilderService.validateInitialEquipment(value, builderConfigVersion);

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

  private static normalizeNarrativeResponses(value: Prisma.InputJsonObject): Prisma.InputJsonValue {
    const allowed = new Set(["before_mark", "motivation_and_bonds", "mark_change"]);
    const entries = Object.entries(value);
    if (entries.some(([key]) => !allowed.has(key))) {
      throw new AppError(400, "Resposta narrativa desconhecida.", "INVALID_NARRATIVE_RESPONSES");
    }
    const normalized: Record<string, string> = {};
    for (const [key, answer] of entries) {
      if (typeof answer !== "string" || answer.trim().length < 1 || answer.trim().length > 8000) {
        throw new AppError(400, "Resposta narrativa invalida.", "INVALID_NARRATIVE_RESPONSES");
      }
      normalized[key] = answer.trim();
    }
    return normalized;
  }

  private static normalizeConfirmedNarrativeContext(value: Prisma.InputJsonObject): Prisma.InputJsonValue {
    const blocks = value.confirmedBlocks;
    const fields = value.fields;
    const allowedBlocks = new Set(["identity", "motivations", "mark"]);
    const allowedFields = new Set([
      "name", "concept", "origin", "appearance", "personalHistory", "desire", "fear",
      "narrativeBond", "promiseOrGuilt", "reasonToActWithGroup", "markLocation",
      "markAppearance", "markReaction", "markAttitude",
    ]);
    if (!Array.isArray(blocks) || blocks.some((block) => typeof block !== "string" || !allowedBlocks.has(block))) {
      throw new AppError(400, "Blocos narrativos confirmados invalidos.", "INVALID_CONFIRMED_NARRATIVE_CONTEXT");
    }
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new AppError(400, "Campos narrativos confirmados invalidos.", "INVALID_CONFIRMED_NARRATIVE_CONTEXT");
    }
    const normalizedFields: Record<string, string> = {};
    for (const [key, content] of Object.entries(fields)) {
      if (!allowedFields.has(key) || typeof content !== "string" || content.trim().length > 8000) {
        throw new AppError(400, "Campo narrativo confirmado invalido.", "INVALID_CONFIRMED_NARRATIVE_CONTEXT");
      }
      if (content.trim()) normalizedFields[key] = content.trim();
    }
    return { confirmedBlocks: [...new Set(blocks)], fields: normalizedFields };
  }

  private static normalizePlayStylePreference(value: string, builderConfigVersion: string): string {
    const options = BuilderService.getConfig(builderConfigVersion).narrativeFlow?.playStyleOptions ?? [];
    if (!options.some((option) => option.key === value)) {
      throw new AppError(400, "Preferencia de jogo invalida.", "INVALID_PLAY_STYLE_PREFERENCE");
    }
    return value;
  }

  private static assertNoDerivedFields(value: Record<string, unknown>): void {
    for (const key of Object.keys(value)) {
      if (/^derived|total|final/i.test(key)) {
        throw new AppError(400, "Totais derivados nao podem ser enviados pelo cliente.", "FORGED_DERIVED_VALUES");
      }
    }
  }

  private static buildSubmissionSnapshotData(
    character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>,
    input: { submittedById: string; submittedAt: Date; sheetRevision: number }
  ): Prisma.CharacterSubmissionSnapshotUncheckedCreateInput {
    if (!character.table?.contextVersionId) {
      throw new AppError(409, "Personagem sem contexto de mesa para submissao.", "CHARACTER_CONTEXT_REQUIRED");
    }

    return {
      characterId: character.id,
      sheetRevision: input.sheetRevision,
      submittedById: input.submittedById,
      submittedAt: input.submittedAt,
      builderConfigVersion: character.builderConfigVersion,
      contextVersionId: character.table.contextVersionId,
      characterSnapshot: {
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
        creativeDossier: character.creativeDossier,
        builderConfigVersion: character.builderConfigVersion,
        narrativeResponses: character.narrativeResponses,
        confirmedNarrativeContext: character.confirmedNarrativeContext,
        playStylePreference: character.playStylePreference,
        derivedResources: BuilderService.calculateDerivedResources(
          character.attributes,
          character.builderConfigVersion
        ),
        sheetRevision: input.sheetRevision,
      },
      episodeAnswersSnapshot: character.episodeAnswers.map((answer) => ({
        id: answer.id,
        questionKey: answer.questionKey,
        promptSnapshot: answer.promptSnapshot,
        answer: answer.answer,
        createdAt: answer.createdAt.toISOString(),
        updatedAt: answer.updatedAt.toISOString(),
      })),
    };
  }

  private static buildNextAction(character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>) {
    if (editableStatuses.has(character.sheetStatus)) {
      return {
        key: character.sheetStatus === CharacterSheetStatus.CHANGES_REQUESTED ? "UPDATE_CHARACTER" : "EDIT_CHARACTER",
        title: character.sheetStatus === CharacterSheetStatus.CHANGES_REQUESTED ? "Ajustar personagem" : "Editar personagem",
      };
    }
    if (character.sheetStatus === CharacterSheetStatus.SUBMITTED) {
      return { key: "WAIT_APPROVAL", title: "Aguardar aprovacao" };
    }
    return { key: "VIEW_CHARACTER", title: "Ver personagem" };
  }

  private static formatCharacter(character: Prisma.CharacterGetPayload<{ include: typeof characterInclude }>) {
    const latestSubmission = character.submissionSnapshots[0] ?? null;
    const approvedSubmission =
      character.submissionSnapshots.find((snapshot) => snapshot.approvedAt !== null) ?? null;
    const review = character.reviews[0] ?? null;

    return {
      id: character.id,
      tableId: character.tableId,
      ownerUserId: character.userId,
      owner: {
        id: character.user.id,
        name: character.user.nome,
        email: character.user.email,
      },
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
      creativeDossier: character.creativeDossier,
      builderConfigVersion: character.builderConfigVersion,
      narrativeResponses: character.narrativeResponses,
      confirmedNarrativeContext: character.confirmedNarrativeContext,
      playStylePreference: character.playStylePreference,
      derivedResources: BuilderService.calculateDerivedResources(
        character.attributes,
        character.builderConfigVersion
      ),
      sheetStatus: character.sheetStatus,
      sheetRevision: character.sheetRevision,
      submittedRevision: character.submittedRevision,
      submittedAt: character.submittedAt,
      approvedAt: character.approvedAt,
      approvedBy: character.approvedBy,
      editable: editableStatuses.has(character.sheetStatus),
      nextAction: this.buildNextAction(character),
      masterFeedback: review?.masterFeedback ?? null,
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            sheetRevision: latestSubmission.sheetRevision,
            submittedAt: latestSubmission.submittedAt,
            builderConfigVersion: latestSubmission.builderConfigVersion,
            contextVersionId: latestSubmission.contextVersionId,
            characterSnapshot: latestSubmission.characterSnapshot,
            episodeAnswersSnapshot: latestSubmission.episodeAnswersSnapshot,
          }
        : null,
      approvedSubmission: approvedSubmission
        ? {
            id: approvedSubmission.id,
            sheetRevision: approvedSubmission.sheetRevision,
            submittedAt: approvedSubmission.submittedAt,
            approvedAt: approvedSubmission.approvedAt,
            approvedById: approvedSubmission.approvedById,
            builderConfigVersion: approvedSubmission.builderConfigVersion,
            contextVersionId: approvedSubmission.contextVersionId,
          }
        : null,
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
