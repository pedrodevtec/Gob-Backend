import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString } from "../../utils/validation";
import { AdminService } from "./admin.service";

export const listMonsters = asyncHandler(async (_req: Request, res: Response) => {
  const monsters = await AdminService.listMonsters();
  sendSuccess(res, 200, { monsters });
});

export const createMonster = asyncHandler(async (req: Request, res: Response) => {
  const monster = await AdminService.createMonster(req.body);
  sendSuccess(res, 201, { monster }, "Monstro criado com sucesso.");
});

export const updateMonster = asyncHandler(async (req: Request, res: Response) => {
  const monsterId = requireString(req.params.id, "id");
  const monster = await AdminService.updateMonster(monsterId, req.body);
  sendSuccess(res, 200, { monster }, "Monstro atualizado com sucesso.");
});

export const listBounties = asyncHandler(async (_req: Request, res: Response) => {
  const bounties = await AdminService.listBounties();
  sendSuccess(res, 200, { bounties });
});

export const createBounty = asyncHandler(async (req: Request, res: Response) => {
  const bounty = await AdminService.createBounty(req.body);
  sendSuccess(res, 201, { bounty }, "Bounty criada com sucesso.");
});

export const updateBounty = asyncHandler(async (req: Request, res: Response) => {
  const bountyId = requireString(req.params.id, "id");
  const bounty = await AdminService.updateBounty(bountyId, req.body);
  sendSuccess(res, 200, { bounty }, "Bounty atualizada com sucesso.");
});

export const listMissions = asyncHandler(async (_req: Request, res: Response) => {
  const missions = await AdminService.listMissions();
  sendSuccess(res, 200, { missions });
});

export const createMission = asyncHandler(async (req: Request, res: Response) => {
  const mission = await AdminService.createMission(req.body);
  sendSuccess(res, 201, { mission }, "Missao criada com sucesso.");
});

export const updateMission = asyncHandler(async (req: Request, res: Response) => {
  const missionId = requireString(req.params.id, "id");
  const mission = await AdminService.updateMission(missionId, req.body);
  sendSuccess(res, 200, { mission }, "Missao atualizada com sucesso.");
});

export const listTrainings = asyncHandler(async (_req: Request, res: Response) => {
  const trainings = await AdminService.listTrainings();
  sendSuccess(res, 200, { trainings });
});

export const createTraining = asyncHandler(async (req: Request, res: Response) => {
  const training = await AdminService.createTraining(req.body);
  sendSuccess(res, 201, { training }, "Treinamento criado com sucesso.");
});

export const updateTraining = asyncHandler(async (req: Request, res: Response) => {
  const trainingId = requireString(req.params.id, "id");
  const training = await AdminService.updateTraining(trainingId, req.body);
  sendSuccess(res, 200, { training }, "Treinamento atualizado com sucesso.");
});

export const listNpcs = asyncHandler(async (_req: Request, res: Response) => {
  const npcs = await AdminService.listNpcs();
  sendSuccess(res, 200, { npcs });
});

export const createNpc = asyncHandler(async (req: Request, res: Response) => {
  const npc = await AdminService.createNpc(req.body);
  sendSuccess(res, 201, { npc }, "NPC criado com sucesso.");
});

export const updateNpc = asyncHandler(async (req: Request, res: Response) => {
  const npcId = requireString(req.params.id, "id");
  const npc = await AdminService.updateNpc(npcId, req.body);
  sendSuccess(res, 200, { npc }, "NPC atualizado com sucesso.");
});
