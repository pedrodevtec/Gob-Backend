import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requireString } from "../../utils/validation";
import {
  DecidePlayerAiSuggestionInput,
  PlayerCharacterAssistantInput,
} from "./ai.types";

export const validatePlayerCharacterAssistant = (req: Request): void => {
  const body = getBody(req);
  const useCase = requireString(body.useCase, "useCase", 24, 40) as PlayerCharacterAssistantInput["useCase"];

  if (!["PLAYER_CHARACTER_CREATION", "PLAYER_CHARACTER_VALIDATION"].includes(useCase)) {
    throw new AppError(400, "Caso de uso de IA do jogador invalido.", "INVALID_PLAYER_AI_USE_CASE");
  }

  const characterId = optionalString(body.characterId, "characterId", 1, 100);
  if (useCase === "PLAYER_CHARACTER_VALIDATION" && !characterId) {
    throw new AppError(400, "characterId e obrigatorio para validacao de personagem.", "CHARACTER_ID_REQUIRED");
  }

  req.body = {
    useCase,
    characterId,
    instruction: optionalString(body.instruction, "instruction", 1, 1000),
  } satisfies PlayerCharacterAssistantInput;
};

export const validateDecidePlayerAiSuggestion = (req: Request): void => {
  const body = getBody(req);
  const decision = requireString(body.decision, "decision", 6, 9).toUpperCase() as DecidePlayerAiSuggestionInput["decision"];

  if (!["ACCEPTED", "EDITED", "DISCARDED"].includes(decision)) {
    throw new AppError(400, "Decisao de sugestao invalida.", "INVALID_AI_SUGGESTION_DECISION");
  }
  if (decision === "EDITED" && !body.editedSuggestion) {
    throw new AppError(400, "editedSuggestion e obrigatorio para decisao EDITED.", "EDITED_SUGGESTION_REQUIRED");
  }

  req.body = {
    decision,
    editedSuggestion: optionalString(body.editedSuggestion, "editedSuggestion", 1, 4000),
  } satisfies DecidePlayerAiSuggestionInput;
};
