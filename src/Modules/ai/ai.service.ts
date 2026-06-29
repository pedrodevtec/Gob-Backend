import prisma from "../../config/db";
import { AppError } from "../../errors/AppError";
import { TableService } from "../tables/table.service";
import { AiClient } from "./ai.client";
import {
  missionIdeasOutputSchema,
  timelineSummaryOutputSchema,
  traitSuggestionsOutputSchema,
  worldSummaryOutputSchema,
} from "./ai.schemas";
import {
  MissionIdeasInput,
  MissionIdeasSuggestion,
  TimelineSummaryInput,
  TimelineSummarySuggestion,
  TraitSuggestions,
  TraitSuggestionsInput,
  WorldSummaryInput,
  WorldSummarySuggestion,
} from "./ai.types";

const BASE_INSTRUCTIONS = [
  "Você auxilia um Mestre de RPG assíncrono.",
  "Responda em português do Brasil.",
  "Produza apenas sugestões curtas, práticas e coerentes com o contexto enviado.",
  "Não afirme que salvou ou alterou dados.",
  "Não invente dados pessoais nem peça segredos.",
].join(" ");

const contextJson = (value: unknown): string => JSON.stringify(value);

export class AiService {
  static async suggestWorldSummary(
    userId: string,
    tableId: string,
    input: WorldSummaryInput
  ): Promise<WorldSummarySuggestion> {
    await TableService.ensureMaster(userId, tableId);

    return AiClient.generateStructured<WorldSummarySuggestion>({
      schemaName: "world_summary_suggestion",
      schema: worldSummaryOutputSchema,
      maxOutputTokens: 700,
      instructions: `${BASE_INSTRUCTIONS} Sugira um mundo de campanha conciso. Limite o resumo a poucos parágrafos e regras/critérios a listas curtas.`,
      prompt: [
        `Instrução adicional: ${input.prompt ?? "Melhore e complete o rascunho existente."}`,
        `Mundo atual: ${contextJson(input.currentWorld ?? {})}`,
      ].join("\n"),
    });
  }

  static async suggestMissionIdeas(
    userId: string,
    tableId: string,
    input: MissionIdeasInput
  ): Promise<MissionIdeasSuggestion> {
    await TableService.ensureMaster(userId, tableId);

    return AiClient.generateStructured<MissionIdeasSuggestion>({
      schemaName: "mission_ideas",
      schema: missionIdeasOutputSchema,
      maxOutputTokens: 900,
      instructions: `${BASE_INSTRUCTIONS} Gere de 1 a 3 ideias de missão. Cada campo deve ter no máximo poucas frases.`,
      prompt: contextJson({
        theme: input.theme ?? null,
        difficulty: input.difficulty ?? null,
        worldSummary: input.worldSummary,
        activeArc: input.activeArc ?? null,
        characters: input.characters,
      }),
    });
  }

  static async suggestTraits(
    userId: string,
    tableId: string,
    input: TraitSuggestionsInput
  ): Promise<TraitSuggestions> {
    await TableService.ensureTableMaster(tableId, userId);
    await TableService.ensureCharacterBelongsToTable(input.characterId, tableId);

    const character = await prisma.character.findFirst({
      where: {
        id: input.characterId,
        tableId,
      },
      select: {
        id: true,
        name: true,
        level: true,
        class: {
          select: {
            name: true,
            description: true,
          },
        },
        table: {
          select: {
            world: {
              select: {
                summary: true,
                tone: true,
              },
            },
          },
        },
        traits: {
          where: { tableId },
          select: {
            type: true,
            name: true,
            description: true,
          },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          where: { tableId },
          select: {
            status: true,
            masterFeedback: true,
          },
          take: 1,
        },
      },
    });

    if (!character) {
      throw new AppError(
        404,
        "Personagem da mesa nao encontrado.",
        "TABLE_CHARACTER_NOT_FOUND"
      );
    }

    return AiClient.generateStructured<TraitSuggestions>({
      schemaName: "character_trait_suggestions",
      schema: traitSuggestionsOutputSchema,
      maxOutputTokens: 900,
      instructions: `${BASE_INSTRUCTIONS} Sugira até 3 traits positivas, 3 negativas e 3 neutras. Evite repetir traits existentes. O campo value deve ser uma orientação curta de efeito narrativo, não uma alteração automática de atributos.`,
      prompt: contextJson({
        instruction: input.instruction ?? null,
        world: character.table?.world ?? null,
        character: {
          name: character.name,
          level: character.level,
          class: character.class,
          review: character.reviews[0] ?? null,
        },
        existingTraits: character.traits,
      }),
    });
  }

  static async suggestTimelineSummary(
    userId: string,
    tableId: string,
    input: TimelineSummaryInput
  ): Promise<TimelineSummarySuggestion> {
    await TableService.ensureMaster(userId, tableId);

    return AiClient.generateStructured<TimelineSummarySuggestion>({
      schemaName: "timeline_summary_suggestion",
      schema: timelineSummaryOutputSchema,
      maxOutputTokens: 450,
      instructions: `${BASE_INSTRUCTIONS} Transforme notas brutas em um título curto e uma descrição objetiva para a timeline. Preserve os fatos fornecidos e não invente resultados importantes.`,
      prompt: contextJson({
        eventType: input.eventType,
        notes: input.notes,
      }),
    });
  }
}
