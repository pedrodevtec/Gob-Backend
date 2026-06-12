import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { TableService } from "./table.service";

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const table = await TableService.createTable(userId, req.body);
  sendSuccess(res, 201, { table }, "Mesa criada com sucesso.");
});

export const listTables = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tables = await TableService.listTables(userId);
  sendSuccess(res, 200, { tables });
});

export const getTable = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.id, "id");
  const table = await TableService.getTable(userId, tableId);
  sendSuccess(res, 200, { table });
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

export const listTableCharacters = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characters = await TableService.listCharacters(userId, tableId);
  sendSuccess(res, 200, { characters });
});

export const reviewTableCharacter = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const review = await TableService.reviewCharacter(userId, tableId, characterId, req.body);
  sendSuccess(res, 200, { review }, "Revisao do personagem atualizada com sucesso.");
});
