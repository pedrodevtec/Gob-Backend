import { Request } from "express";
import { AppError } from "../../errors/AppError";
import {
  getBody,
  optionalString,
  requireArray,
  requireObject,
  requireString,
} from "../../utils/validation";
import {
  MissionIdeaCharacterInput,
  MissionIdeasInput,
  TimelineSummaryInput,
  TraitSuggestionsInput,
  WorldSummaryInput,
} from "./ai.types";

const optionalWorldField = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string | undefined => optionalString(value, fieldName, 0, maxLength);

export const validateWorldSummarySuggestion = (req: Request): void => {
  const body = getBody(req);
  let currentWorld: WorldSummaryInput["currentWorld"];

  if (body.currentWorld !== undefined) {
    const world = requireObject(body.currentWorld, "currentWorld");
    currentWorld = {
      title: optionalWorldField(world.title, "currentWorld.title", 160),
      summary: optionalWorldField(world.summary, "currentWorld.summary", 4000),
      tone: optionalWorldField(world.tone, "currentWorld.tone", 200),
      rules: optionalWorldField(world.rules, "currentWorld.rules", 3000),
      characterCriteria: optionalWorldField(
        world.characterCriteria,
        "currentWorld.characterCriteria",
        3000
      ),
    };
  }

  req.body = {
    prompt: optionalString(body.prompt, "prompt", 1, 1000),
    currentWorld,
  } satisfies WorldSummaryInput;
};

export const validateMissionIdeas = (req: Request): void => {
  const body = getBody(req);
  const characters = requireArray(body.characters, "characters");

  if (characters.length > 10) {
    throw new AppError(400, "Campo characters deve conter no maximo 10 itens.", "VALIDATION_ERROR");
  }

  const parsedCharacters: MissionIdeaCharacterInput[] = characters.map((value, index) => {
    const character = requireObject(value, `characters[${index}]`);
    return {
      name: optionalString(character.name, `characters[${index}].name`, 1, 100),
      className: optionalString(
        character.className,
        `characters[${index}].className`,
        1,
        100
      ),
      summary: optionalString(character.summary, `characters[${index}].summary`, 1, 300),
    };
  });

  req.body = {
    theme: optionalString(body.theme, "theme", 1, 200),
    difficulty: optionalString(body.difficulty, "difficulty", 1, 80),
    worldSummary: requireString(body.worldSummary, "worldSummary", 1, 4000),
    activeArc: optionalString(body.activeArc, "activeArc", 1, 2000),
    characters: parsedCharacters,
  } satisfies MissionIdeasInput;
};

export const validateTraitSuggestions = (req: Request): void => {
  const body = getBody(req);
  req.body = {
    characterId: requireString(body.characterId, "characterId", 1, 100),
    instruction: optionalString(body.instruction, "instruction", 1, 1000),
  } satisfies TraitSuggestionsInput;
};

export const validateTimelineSummary = (req: Request): void => {
  const body = getBody(req);
  const eventType = requireString(body.eventType, "eventType", 8, 30);

  if (!["SESSION_SUMMARY", "MASTER_NOTE"].includes(eventType)) {
    throw new AppError(400, "Campo eventType invalido.", "VALIDATION_ERROR");
  }

  req.body = {
    notes: requireString(body.notes, "notes", 1, 5000),
    eventType: eventType as TimelineSummaryInput["eventType"],
  } satisfies TimelineSummaryInput;
};
