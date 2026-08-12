import {
  PlayerAiSuggestion,
  PlayerAiSuggestionStatus,
  Prisma,
  TableMemberRole,
} from "@prisma/client";
import crypto from "crypto";
import prisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import { CampaignPilotService } from "../campaigns/campaignPilot.service";
import { TableService } from "../tables/table.service";
import { AiContextService } from "./ai.context.service";
import { AiGateway } from "./ai.gateway";
import {
  characterChapterSuggestionsOutputSchema,
  characterMechanicalProposalOutputSchema,
  playerCharacterAssistantOutputSchema,
} from "./ai.schemas";
import {
  CharacterChapterSuggestionInput,
  CharacterChapterSuggestionOutput,
  CharacterMechanicalProposal,
  CharacterMechanicalProposalInput,
  DecidePlayerAiSuggestionInput,
  PlayerCharacterAssistantInput,
  PlayerCharacterAssistantOutput,
} from "./ai.types";

const PLAYER_ASSISTANT_INSTRUCTIONS = [
  "Voce auxilia um jogador criando ou revisando o proprio personagem.",
  "Responda em portugues do Brasil.",
  "Sugira possibilidades, nao decisoes definitivas.",
  "Nao salve, confirme, canonize ou altere ficha.",
  "Nao declare que uma ligacao narrativa e verdadeira.",
  "Nao invente segredo, spoiler, passado obrigatorio ou informacao oculta.",
  "Cada sugestao deve orientar o jogador a aceitar, editar ou descartar.",
].join(" ");

const CHARACTER_CHAPTER_PROMPT_VERSION = "character-chapter-v1";
const CHARACTER_MECHANICS_PROMPT_VERSION = "character-mechanics-v1";
const MAX_CHAPTER_SUGGESTIONS = 3;

const CHAPTER_ASSISTANT_INSTRUCTIONS = [
  "Voce auxilia um jogador no Character Builder de Guardian of Bravantus.",
  "A IA sugere. O Mestre decide. O jogador personaliza. A plataforma registra.",
  "Responda em portugues do Brasil.",
  "Sugira conteudo apenas para os campos solicitados.",
  "Nao altere ficha, nao canonize fatos e nao revele ou invente segredos.",
  "Rationale deve ser curta e citar somente tipos de informacao autorizada.",
  "basedOn deve conter apenas nomes de campos, nunca conteudo.",
].join(" ");

const FORBIDDEN_RESPONSE_MARKERS = [
  "gm_secret",
  "SECRET_CANON",
  "TABLE_MASTER",
  "AUTHOR_ADMIN",
  "Zurich",
];

export class PlayerAiService {
  static async suggestCharacterHelp(
    userId: string,
    tableId: string,
    input: PlayerCharacterAssistantInput
  ): Promise<PlayerCharacterAssistantOutput> {
    const context = await AiContextService.buildPlayerCharacterContext({
      userId,
      tableId,
      useCase: input.useCase,
      characterId: input.characterId,
    });

    let output: PlayerCharacterAssistantOutput;
    try {
      const result = await AiGateway.generateStructured<PlayerCharacterAssistantOutput>({
        useCase: input.useCase,
        userId,
        tableId,
        characterId: input.characterId,
        contextVersionId: context.contextVersion.id,
        promptVersion: "player-character-assistant-v1",
        schemaName: "player_character_assistant",
        schema: playerCharacterAssistantOutputSchema,
        maxOutputTokens: 900,
        instructions: PLAYER_ASSISTANT_INSTRUCTIONS,
        prompt: JSON.stringify({
          instruction: input.instruction ?? null,
          builderConfig: BuilderService.getActiveConfig(),
          context,
        }),
      });
      output = result.data;
    } catch (error) {
      await CampaignPilotService.recordAnalyticsEvent({
        userId,
        tableId,
        characterId: input.characterId,
        eventKey: "ai_suggestion_failed",
        source: "player_ai",
        metadata: {
          useCase: input.useCase,
          promptVersion: "player-character-assistant-v1",
          model: env.AI_MODEL,
          error: error instanceof AppError ? error.code : "AI_REQUEST_FAILED",
        },
      });
      throw error;
    }

    const records: PlayerAiSuggestion[] = [];
    for (const suggestion of output.suggestions) {
      records.push(
        await prisma.playerAiSuggestion.create({
          data: {
            userId,
            tableId,
            characterId: input.characterId ?? null,
            useCase: input.useCase,
            builderConfigVersion: BuilderService.getActiveConfig().version,
            promptVersion: "player-character-assistant-v1",
            model: env.AI_MODEL,
            suggestion: suggestion as unknown as Prisma.InputJsonValue,
          },
        })
      );
    }
    await CampaignPilotService.recordAnalyticsEvent({
      userId,
      tableId,
      characterId: input.characterId,
      eventKey: "ai_suggestion_generated",
      source: "player_ai",
      metadata: {
        useCase: input.useCase,
        promptVersion: "player-character-assistant-v1",
        model: env.AI_MODEL,
        suggestionsCount: output.suggestions.length,
      },
    });

    return {
      warnings: output.warnings,
      suggestions: output.suggestions.map((suggestion, index) => ({
        id: records[index]?.id,
        ...suggestion,
      })),
    };
  }

  static async suggestCharacterChapter(
    userId: string,
    tableId: string,
    characterId: string,
    input: CharacterChapterSuggestionInput
  ): Promise<CharacterChapterSuggestionOutput> {
    const authorized = await AiContextService.buildAuthorizedCharacterBuilderContext({
      authenticatedUserId: userId,
      tableId,
      characterId,
      targetChapter: input.targetChapter,
      targetFields: input.targetFields,
      expectedRevision: input.expectedRevision,
      playerIntent: input.playerIntent,
    });

    const fingerprint = this.buildSuggestionFingerprint({
      characterId,
      sheetRevision: authorized.characterRevision,
      targetChapter: input.targetChapter,
      targetFields: authorized.targetFields,
      promptVersion: CHARACTER_CHAPTER_PROMPT_VERSION,
      contextHash: authorized.contextHash,
      playerIntent: input.playerIntent,
    });

    const cached = await prisma.playerAiSuggestion.findMany({
      where: {
        userId,
        tableId,
        characterId,
        useCase: { in: ["CHARACTER_CHAPTER_SUGGESTION", "CHARACTER_FIELD_REFINEMENT"] },
        fingerprint,
        status: PlayerAiSuggestionStatus.GENERATED,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    if (cached.length) {
      return {
        suggestions: cached.slice(0, MAX_CHAPTER_SUGGESTIONS).map((record) =>
          this.formatChapterSuggestion(record)
        ),
        characterRevision: authorized.characterRevision,
        promptVersion: CHARACTER_CHAPTER_PROMPT_VERSION,
        cached: true,
      };
    }

    const result = await AiGateway.generateStructured<{ suggestions: Array<{
      targetField: string;
      content: string;
      rationale: string;
      basedOn: string[];
    }> }>({
      useCase: "CHARACTER_CHAPTER_SUGGESTION",
      userId,
      tableId,
      characterId,
      contextVersionId: authorized.contextVersionId,
      promptVersion: CHARACTER_CHAPTER_PROMPT_VERSION,
      schemaName: "character_chapter_suggestions",
      schema: characterChapterSuggestionsOutputSchema,
      maxOutputTokens: 900,
      instructions: CHAPTER_ASSISTANT_INSTRUCTIONS,
      prompt: JSON.stringify({
        targetChapter: input.targetChapter,
        targetFields: authorized.targetFields,
        playerIntent: input.playerIntent ?? null,
        authorizedContext: authorized.context,
      }),
    });

    const records: PlayerAiSuggestion[] = [];
    for (const suggestion of result.data.suggestions.slice(0, MAX_CHAPTER_SUGGESTIONS)) {
      if (!authorized.targetFields.includes(suggestion.targetField)) {
        continue;
      }
      const sanitized = this.sanitizeChapterSuggestion(suggestion, authorized.targetFields);
      const useCase = this.hasExistingFieldContent(authorized.context.character.fields, sanitized.targetField)
        ? "CHARACTER_FIELD_REFINEMENT"
        : "CHARACTER_CHAPTER_SUGGESTION";
      records.push(
        await prisma.playerAiSuggestion.create({
          data: {
            userId,
            tableId,
            characterId,
            useCase,
            targetField: sanitized.targetField,
            builderConfigVersion: authorized.context.builder.version,
            promptVersion: CHARACTER_CHAPTER_PROMPT_VERSION,
            fingerprint,
            contextVersionId: authorized.contextVersionId,
            aiUsageEventId: result.usageEventId ?? null,
            model: result.model,
            suggestion: sanitized as unknown as Prisma.InputJsonValue,
          },
        })
      );
    }

    return {
      suggestions: records.map((record) => this.formatChapterSuggestion(record)),
      characterRevision: authorized.characterRevision,
      promptVersion: CHARACTER_CHAPTER_PROMPT_VERSION,
      cached: false,
    };
  }

  static async suggestCharacterMechanics(
    userId: string,
    tableId: string,
    characterId: string,
    input: CharacterMechanicalProposalInput
  ): Promise<CharacterMechanicalProposal> {
    const authorized = await AiContextService.buildAuthorizedMechanicalProposalContext({
      authenticatedUserId: userId,
      tableId,
      characterId,
      expectedRevision: input.expectedRevision,
    });
    const context = authorized.context;
    const builderConfig = BuilderService.getConfig(context.builder.version);
    const result = await AiGateway.generateStructured<Omit<CharacterMechanicalProposal, "id" | "characterRevision" | "promptVersion">>({
      useCase: "PLAYER_CHARACTER_CREATION",
      userId,
      tableId,
      characterId,
      contextVersionId: authorized.contextVersionId,
      promptVersion: CHARACTER_MECHANICS_PROMPT_VERSION,
      schemaName: "character_mechanical_proposal",
      schema: characterMechanicalProposalOutputSchema,
      maxOutputTokens: 1200,
      instructions: [
        CHAPTER_ASSISTANT_INSTRUCTIONS,
        "Use somente o contexto narrativo confirmado e a preferencia de jogo.",
        "Use exclusivamente arquetipos, atributos, treinamentos e slots presentes no catalogo enviado.",
        "A proposta nunca e aplicada automaticamente.",
      ].join(" "),
      prompt: JSON.stringify({
        confirmedNarrativeContext: context.character.confirmedNarrativeContext,
        playStylePreference: context.character.playStylePreference,
        publicContext: context.publicContext,
        catalogs: {
          archetypes: builderConfig.archetypes.options,
          attributes: builderConfig.attributes,
          trainings: builderConfig.trainings,
          equipment: builderConfig.equipment,
        },
      }),
    });

    const allowedArchetypes = new Set(builderConfig.archetypes.options.map((item) => item.key));
    const archetypes = result.data.archetypes
      .filter((item) => allowedArchetypes.has(item.key))
      .slice(0, 3)
      .map((item) => ({ key: item.key, rationale: item.rationale.trim().slice(0, 500) }));
    if (!archetypes.length) {
      throw new AppError(502, "A IA nao retornou arquetipo oficial valido.", "INVALID_AI_MECHANICAL_PROPOSAL");
    }
    const attributes = BuilderService.normalizeAttributes(result.data.attributes, builderConfig.version);
    const trainings = BuilderService.normalizeTrainings(result.data.trainings, builderConfig.version);
    const equipment = result.data.equipment.map((item) => ({
      slot: item.slot,
      name: item.name.trim().slice(0, 120),
      description: item.description?.trim().slice(0, 500),
    }));
    BuilderService.validateInitialEquipment(equipment, builderConfig.version);
    const proposal = {
      archetypes,
      positiveTrait: result.data.positiveTrait.trim().slice(0, 500),
      negativeTrait: result.data.negativeTrait.trim().slice(0, 500),
      attributes,
      trainings,
      equipment,
      rationale: result.data.rationale.trim().slice(0, 1000),
      characterRevision: authorized.characterRevision,
      promptVersion: CHARACTER_MECHANICS_PROMPT_VERSION,
    };
    this.assertNoProtectedMarkers(proposal);

    const record = await prisma.playerAiSuggestion.create({
      data: {
        userId,
        tableId,
        characterId,
        useCase: "PLAYER_CHARACTER_CREATION",
        targetField: "mechanicalProposal",
        builderConfigVersion: builderConfig.version,
        promptVersion: CHARACTER_MECHANICS_PROMPT_VERSION,
        contextVersionId: authorized.contextVersionId,
        aiUsageEventId: result.usageEventId ?? null,
        model: result.model,
        suggestion: proposal as unknown as Prisma.InputJsonValue,
      },
    });

    return { id: record.id, ...proposal };
  }

  static async decideSuggestion(
    userId: string,
    tableId: string,
    suggestionId: string,
    input: DecidePlayerAiSuggestionInput
  ) {
    const roleContext = await TableService.getTableRoleContext(tableId, userId);
    if (roleContext.role !== TableMemberRole.PLAYER) {
      throw new AppError(403, "Decisao de sugestao restrita ao PLAYER ativo da mesa.", "TABLE_PLAYER_REQUIRED");
    }

    const suggestion = await prisma.playerAiSuggestion.findFirst({
      where: {
        id: suggestionId,
        tableId,
        userId,
      },
    });

    if (!suggestion) {
      throw new AppError(404, "Sugestao de IA nao encontrada.", "PLAYER_AI_SUGGESTION_NOT_FOUND");
    }
    if (suggestion.characterId) {
      const character = await prisma.character.findFirst({
        where: { id: suggestion.characterId, tableId, userId },
        select: { id: true },
      });
      if (!character) {
        throw new AppError(404, "Sugestao de IA nao encontrada.", "PLAYER_AI_SUGGESTION_NOT_FOUND");
      }
    }

    if (suggestion.status !== PlayerAiSuggestionStatus.GENERATED) {
      if (suggestion.status === input.decision) {
        return suggestion;
      }
      throw new AppError(409, "Sugestao de IA ja foi decidida com outro estado.", "PLAYER_AI_SUGGESTION_ALREADY_DECIDED");
    }

    const appliedContent = input.appliedContent ?? input.editedSuggestion;
    if (input.decision === "EDITED" && !appliedContent) {
      throw new AppError(400, "appliedContent e obrigatorio para decisao EDITED.", "EDITED_SUGGESTION_REQUIRED");
    }

    const updated = await prisma.playerAiSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: input.decision,
        decisionPayload: {
          decision: input.decision,
          appliedContentProvided: Boolean(appliedContent),
          appliedContentLength: appliedContent?.length ?? null,
        },
        appliedContentHash: appliedContent ? this.hashText(appliedContent) : null,
        decidedAt: new Date(),
      },
    });
    await CampaignPilotService.recordAnalyticsEvent({
      userId,
      tableId,
      characterId: updated.characterId ?? undefined,
      eventKey: "ai_suggestion_decided",
      source: "player_ai",
      metadata: {
        useCase: updated.useCase,
        promptVersion: updated.promptVersion,
        model: updated.model,
        decision: input.decision,
      },
    });

    return updated;
  }

  private static buildSuggestionFingerprint(input: {
    characterId: string;
    sheetRevision: number;
    targetChapter: string;
    targetFields: string[];
    promptVersion: string;
    contextHash: string;
    playerIntent?: string;
  }): string {
    return this.hashText(JSON.stringify({
      characterId: input.characterId,
      sheetRevision: input.sheetRevision,
      targetChapter: input.targetChapter,
      targetFields: [...input.targetFields].sort(),
      promptVersion: input.promptVersion,
      contextHash: input.contextHash,
      playerIntent: input.playerIntent?.trim().replace(/\s+/g, " ").toLowerCase() ?? null,
    }));
  }

  private static sanitizeChapterSuggestion(
    suggestion: { targetField: string; content: string; rationale: string; basedOn: string[] },
    allowedFields: string[]
  ) {
    const value = {
      targetField: suggestion.targetField,
      content: suggestion.content.trim(),
      rationale: suggestion.rationale.trim().slice(0, 500),
      basedOn: suggestion.basedOn
        .map((entry) => entry.trim())
        .filter((entry) => allowedFields.includes(entry) || /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(entry))
        .slice(0, 5),
      status: "GENERATED" as const,
    };
    const serialized = JSON.stringify(value);
    for (const marker of FORBIDDEN_RESPONSE_MARKERS) {
      if (serialized.toLowerCase().includes(marker.toLowerCase())) {
        throw new AppError(502, "Resposta da IA bloqueada por conter dado protegido.", "AI_RESPONSE_SECRET_LEAK_BLOCKED");
      }
    }
    return value;
  }

  private static assertNoProtectedMarkers(value: unknown): void {
    const serialized = JSON.stringify(value).toLowerCase();
    for (const marker of FORBIDDEN_RESPONSE_MARKERS) {
      if (serialized.includes(marker.toLowerCase())) {
        throw new AppError(502, "Resposta da IA bloqueada por conter dado protegido.", "AI_RESPONSE_SECRET_LEAK_BLOCKED");
      }
    }
  }

  private static formatChapterSuggestion(record: PlayerAiSuggestion) {
    const suggestion = record.suggestion as Prisma.JsonObject;
    return {
      id: record.id,
      targetField: String(suggestion.targetField ?? record.targetField ?? ""),
      content: String(suggestion.content ?? suggestion.suggestion ?? ""),
      rationale: String(suggestion.rationale ?? ""),
      basedOn: Array.isArray(suggestion.basedOn) ? suggestion.basedOn.map(String) : [],
      status: "GENERATED" as const,
    };
  }

  private static hasExistingFieldContent(fields: Record<string, unknown>, targetField: string): boolean {
    const value = fields[targetField];
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  }

  private static hashText(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
