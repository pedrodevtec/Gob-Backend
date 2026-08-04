import {
  PlayerAiSuggestion,
  PlayerAiSuggestionStatus,
  Prisma,
  TableMemberRole,
} from "@prisma/client";
import prisma from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { BuilderService } from "../builder/builder.service";
import { CampaignPilotService } from "../campaigns/campaignPilot.service";
import { TableService } from "../tables/table.service";
import { AiClient } from "./ai.client";
import { AiContextService } from "./ai.context.service";
import { playerCharacterAssistantOutputSchema } from "./ai.schemas";
import {
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
      output = await AiClient.generateStructured<PlayerCharacterAssistantOutput>({
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
    if (suggestion.status !== PlayerAiSuggestionStatus.GENERATED) {
      throw new AppError(409, "Sugestao de IA ja foi decidida.", "PLAYER_AI_SUGGESTION_ALREADY_DECIDED");
    }

    const updated = await prisma.playerAiSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: input.decision,
        decisionPayload: {
          decision: input.decision,
          editedSuggestion: input.editedSuggestion ?? null,
        },
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
}
