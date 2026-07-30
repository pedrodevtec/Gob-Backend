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
import { TablePackage02Service } from "./tablePackage02.service";
import { TableCharacterPackage03Service } from "./tableCharacterPackage03.service";

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const table = await TablePackage02Service.createTable(userId, req.body);
  sendSuccess(res, 201, { table }, "Mesa criada com sucesso.");
});

export const listTables = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tables = await TablePackage02Service.listTables(userId);
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
  const table = await TablePackage02Service.getTable(userId, tableId);
  sendSuccess(res, 200, { table });
});

export const updateTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const table = await TablePackage02Service.updateTable(userId, tableId, req.body);
  sendSuccess(res, 200, { table }, "Mesa atualizada com sucesso.");
});

export const listTableMembers = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const members = await TablePackage02Service.listMembers(userId, tableId);
  sendSuccess(res, 200, { members });
});

export const createTableInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const result = await TablePackage02Service.createInvitation(userId, tableId, req.body);
  sendSuccess(res, 201, result, "Convite criado com sucesso.");
});

export const listTableInvitations = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const invitations = await TablePackage02Service.listPendingInvitations(userId, tableId);
  sendSuccess(res, 200, { invitations });
});

export const revokeTableInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const invitationId = requireString(req.params.invitationId, "invitationId");
  const invitation = await TablePackage02Service.revokeInvitation(userId, tableId, invitationId);
  sendSuccess(res, 200, { invitation }, "Convite revogado com sucesso.");
});

export const acceptTableInvitation = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await TablePackage02Service.acceptInvitation(userId, req.body);
  sendSuccess(res, 200, result, "Convite aceito com sucesso.");
});

export const getTablePlayerContext = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const context = await TablePackage02Service.getPlayerContext(userId, tableId);
  sendSuccess(res, 200, { context });
});

export const getTableMasterContext = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const context = await TablePackage02Service.getMasterContext(userId, tableId);
  sendSuccess(res, 200, { context });
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
  const character = await TableCharacterPackage03Service.createDraft(userId, tableId, req.body);
  sendSuccess(res, 201, { character }, "Rascunho de personagem criado com sucesso.");
});

export const getMyTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const character = await TableCharacterPackage03Service.getMyCharacter(userId, tableId);
  sendSuccess(res, 200, { character });
});

export const getTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.getCharacter(userId, tableId, characterId);
  sendSuccess(res, 200, { character });
});

export const updateTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.updateDraft(userId, tableId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Rascunho de personagem atualizado com sucesso.");
});

export const upsertTableCharacterEpisodeAnswers = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.upsertEpisodeAnswers(
    userId,
    tableId,
    characterId,
    req.body.answers
  );
  sendSuccess(res, 200, { character }, "Respostas de episodio salvas com sucesso.");
});

export const submitTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.submit(userId, tableId, characterId);
  sendSuccess(res, 200, { character }, "Personagem submetido para revisao.");
});

export const listTableCharacterReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characters = await TableCharacterPackage03Service.listReviewQueue(userId, tableId);
  sendSuccess(res, 200, { characters });
});

export const listTableCharacterReviewEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const reviews = await TableCharacterPackage03Service.listReviewEvents(userId, tableId, characterId);
  sendSuccess(res, 200, { reviews });
});

export const requestTableCharacterChanges = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.requestChanges(userId, tableId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Alteracoes solicitadas.");
});

export const approveTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const character = await TableCharacterPackage03Service.approve(userId, tableId, characterId, req.body);
  sendSuccess(res, 200, { character }, "Personagem aprovado.");
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
