import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import {
  getListCharacterTraitsQuery,
  getListTableCharactersQuery,
  getListTableMissionsQuery,
  getListTableSubmissionsQuery,
  getListTableTimelineQuery,
} from "./table.schema";
import { TableService } from "./table.service";

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const table = await TableService.createTableWithTimeline(userId, req.body);
  sendSuccess(res, 201, { table }, "Mesa criada com sucesso.");
});

export const listTables = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tables = await TableService.listTables(userId);
  sendSuccess(res, 200, { tables });
});

export const getTablesDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const dashboard = await TableService.getDashboard(userId);
  sendSuccess(res, 200, dashboard);
});

export const getTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.id, "id");
  const table = await TableService.getTable(userId, tableId);
  sendSuccess(res, 200, { table });
});

export const getMasterOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const overview = await TableService.getMasterOverview(userId, tableId);
  sendSuccess(res, 200, { overview });
});

export const getPlayerOverview = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const overview = await TableService.getPlayerOverview(userId, tableId);
  sendSuccess(res, 200, { overview });
});

export const joinTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const table = await TableService.joinTable(userId, req.body);
  sendSuccess(res, 200, { table }, "Entrada na mesa realizada com sucesso.");
});

export const getTableWorld = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const world = await TableService.getWorld(userId, tableId);
  sendSuccess(res, 200, { world });
});

export const upsertTableWorld = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const world = await TableService.upsertWorld(userId, tableId, req.body);
  sendSuccess(res, 200, { world }, "Mundo da mesa salvo com sucesso.");
});

export const createTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.createCharacter(userId, tableId, req.body);
  sendSuccess(res, 201, result, "Personagem enviado para revisao da mesa.");
});

export const getMyTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const character = await TableService.getMyCharacter(userId, tableId);
  sendSuccess(res, 200, { character });
});

export const listTableCharacters = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.listCharacters(
    userId,
    tableId,
    getListTableCharactersQuery(req)
  );
  sendSuccess(res, 200, {
    characters: result.items,
    ...result,
  });
});

export const reviewTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const review = await TableService.reviewCharacter(userId, tableId, characterId, req.body);
  sendSuccess(res, 200, { review }, "Revisao do personagem atualizada com sucesso.");
});

export const listCharacterTraits = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const result = await TableService.listCharacterTraits(
    userId,
    tableId,
    characterId,
    getListCharacterTraitsQuery(req)
  );
  sendSuccess(res, 200, {
    traits: result.items,
    ...result,
  });
});

export const createCharacterTrait = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const trait = await TableService.createCharacterTrait(userId, tableId, characterId, req.body);
  sendSuccess(res, 201, { trait }, "Trait criada com sucesso.");
});

export const listCharacterTraitSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const suggestions = await TableService.listCharacterTraitSuggestions(userId, tableId, characterId);
  sendSuccess(res, 200, { suggestions });
});

export const createCharacterTraitSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const suggestion = await TableService.createCharacterTraitSuggestion(
    userId,
    tableId,
    characterId,
    req.body
  );
  sendSuccess(res, 201, { suggestion }, "Sugestao de trait criada com sucesso.");
});

export const applyCharacterTraitSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const suggestionId = requireString(req.params.suggestionId, "suggestionId");
  const result = await TableService.applyCharacterTraitSuggestion(
    userId,
    tableId,
    characterId,
    suggestionId
  );
  sendSuccess(res, 200, result, "Sugestao aplicada com sucesso.");
});

export const dismissCharacterTraitSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const suggestionId = requireString(req.params.suggestionId, "suggestionId");
  const suggestion = await TableService.dismissCharacterTraitSuggestion(
    userId,
    tableId,
    characterId,
    suggestionId
  );
  sendSuccess(res, 200, { suggestion }, "Sugestao descartada com sucesso.");
});

export const deleteCharacterTrait = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const traitId = requireString(req.params.traitId, "traitId");
  const result = await TableService.deleteCharacterTrait(userId, tableId, characterId, traitId);
  sendSuccess(res, 200, result);
});

export const createTableMission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const mission = await TableService.createMission(userId, tableId, req.body);
  sendSuccess(res, 201, { mission }, "Missao criada com sucesso.");
});

export const listTableMissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.listMissions(
    userId,
    tableId,
    getListTableMissionsQuery(req)
  );
  sendSuccess(res, 200, {
    missions: result.items,
    ...result,
  });
});

export const getTableMission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const missionId = requireString(req.params.missionId, "missionId");
  const mission = await TableService.getMission(userId, tableId, missionId);
  sendSuccess(res, 200, { mission });
});

export const updateTableMission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const missionId = requireString(req.params.missionId, "missionId");
  const mission = await TableService.updateMission(userId, tableId, missionId, req.body);
  sendSuccess(res, 200, { mission }, "Missao atualizada com sucesso.");
});

export const createMissionSubmission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const missionId = requireString(req.params.missionId, "missionId");
  const submission = await TableService.createMissionSubmission(userId, tableId, missionId, req.body);
  sendSuccess(res, 201, { submission }, "Resposta enviada com sucesso.");
});

export const listMissionSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const missionId = requireString(req.params.missionId, "missionId");
  const submissions = await TableService.listMissionSubmissions(userId, tableId, missionId);
  sendSuccess(res, 200, { submissions });
});

export const listTableSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.listTableSubmissions(
    userId,
    tableId,
    getListTableSubmissionsQuery(req)
  );
  sendSuccess(res, 200, {
    submissions: result.items,
    ...result,
  });
});

export const listMyTableSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.listMyTableSubmissions(
    userId,
    tableId,
    getListTableSubmissionsQuery(req)
  );
  sendSuccess(res, 200, {
    submissions: result.items,
    ...result,
  });
});

export const reviewMissionSubmission = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const missionId = requireString(req.params.missionId, "missionId");
  const submissionId = requireString(req.params.submissionId, "submissionId");
  const submission = await TableService.reviewMissionSubmission(
    userId,
    tableId,
    missionId,
    submissionId,
    req.body
  );
  sendSuccess(res, 200, { submission }, "Resposta revisada com sucesso.");
});

export const listTimelineEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TableService.listTimelineEvents(
    userId,
    tableId,
    getListTableTimelineQuery(req)
  );
  sendSuccess(res, 200, {
    events: result.items,
    ...result,
  });
});

export const createTimelineEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const event = await TableService.createTimelineEvent(userId, tableId, req.body);
  sendSuccess(res, 201, { event }, "Evento de timeline criado com sucesso.");
});
