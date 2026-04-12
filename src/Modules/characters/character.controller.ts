import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { AppError } from "../../errors/AppError";
import { CharacterService } from "./character.service";

const parseRankingLimit = (value: unknown) => {
  if (value === undefined) {
    return 10;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new AppError(400, "Query limit deve ser um inteiro entre 1 e 50.", "VALIDATION_ERROR");
  }

  return parsed;
};

export const listClasses = asyncHandler(async (_req: Request, res: Response) => {
  const classes = await CharacterService.listClasses();
  sendSuccess(res, 200, { classes });
});

export const createCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const character = await CharacterService.createCharacter(userId, req.body);
  sendSuccess(res, 201, { character }, "Personagem criado com sucesso.");
});

export const getCharacters = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characters = await CharacterService.getCharactersByUser(userId);
  sendSuccess(res, 200, { characters });
});

export const getCharacterRankings = asyncHandler(async (req: Request, res: Response) => {
  requireUserId(req);
  const rankings = await CharacterService.getRankings(parseRankingLimit(req.query.limit));
  sendSuccess(res, 200, { rankings });
});

export const getPublicCharacterProfile = asyncHandler(async (req: Request, res: Response) => {
  requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const profile = await CharacterService.getPublicCharacterProfile(characterId);
  sendSuccess(res, 200, { profile });
});

export const getCharacterById = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const character = await CharacterService.getCharacterById(userId, characterId);
  sendSuccess(res, 200, { character });
});

export const getCharacterSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const summary = await CharacterService.getCharacterSummary(userId, characterId);
  sendSuccess(res, 200, { summary });
});

export const updateCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const character = await CharacterService.updateCharacterProfile(userId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Personagem atualizado com sucesso.");
});

export const updateCharacterProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const character = await CharacterService.updateCharacterProgress(userId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Progresso atualizado com sucesso.");
});

export const updateCharacterPosition = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const character = await CharacterService.updateCharacterPosition(userId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Posicao atualizada com sucesso.");
});

export const updateCharacterCustomization = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const character = await CharacterService.updateCharacterCustomization(userId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Personalizacao atualizada com sucesso.");
});

export const awakenCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const result = await CharacterService.awakenCharacter(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Awaken realizado com sucesso.");
});

export const deleteCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.id, "id");
  const result = await CharacterService.deleteCharacter(userId, characterId);
  sendSuccess(res, 200, result);
});
