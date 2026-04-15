import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { GameplayService } from "./gameplay.service";

export const getJourneyOptions = asyncHandler(async (_req: Request, res: Response) => {
  const journey = await GameplayService.getJourneyOptions();
  sendSuccess(res, 200, { journey });
});

export const listMonsters = asyncHandler(async (_req: Request, res: Response) => {
  const monsters = await GameplayService.listMonsters();
  sendSuccess(res, 200, { monsters });
});

export const listBounties = asyncHandler(async (_req: Request, res: Response) => {
  const bounties = await GameplayService.listActiveBounties();
  sendSuccess(res, 200, { bounties });
});

export const listMissions = asyncHandler(async (_req: Request, res: Response) => {
  const missions = await GameplayService.listActiveMissions();
  sendSuccess(res, 200, { missions });
});

export const listTrainings = asyncHandler(async (_req: Request, res: Response) => {
  const trainings = await GameplayService.listActiveTrainings();
  sendSuccess(res, 200, { trainings });
});

export const listNpcs = asyncHandler(async (_req: Request, res: Response) => {
  const npcs = await GameplayService.listActiveNpcs();
  sendSuccess(res, 200, { npcs });
});

export const listMissionSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const sessions = await GameplayService.listMissionSessions(userId, characterId);
  sendSuccess(res, 200, { sessions });
});

export const getMissionSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const sessionId = requireString(req.params.sessionId, "sessionId");
  const session = await GameplayService.getMissionSession(userId, characterId, sessionId);
  sendSuccess(res, 200, { session });
});

export const startMissionJourney = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.startMissionJourney(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Jornada da missao iniciada com sucesso.");
});

export const progressMissionJourney = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const sessionId = requireString(req.params.sessionId, "sessionId");
  const result = await GameplayService.progressMissionJourney(userId, characterId, sessionId, req.body);
  sendSuccess(res, 200, { result }, "Etapa da missao atualizada com sucesso.");
});

export const executeBountyHunt = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.executeBountyHunt(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Bounty hunt executada com sucesso.");
});

export const executeMission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.executeMission(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Missao executada com sucesso.");
});

export const executeTraining = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.executeTraining(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Treinamento concluido com sucesso.");
});

export const executeNpcInteraction = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.executeNpcInteraction(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Interacao com NPC concluida com sucesso.");
});

export const executeMarketAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await GameplayService.executeMarketAction(userId, characterId, req.body);
  sendSuccess(res, 200, { result }, "Acao de mercado concluida com sucesso.");
});

export const executeCombatTurn = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const combatSessionId = requireString(req.params.combatSessionId, "combatSessionId");
  const result = await GameplayService.executeCombatTurn(userId, characterId, combatSessionId, req.body);
  sendSuccess(res, 200, { result }, "Turno de combate processado com sucesso.");
});
