import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { InventoryService } from "./inventory.service";

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const inventory = await InventoryService.getInventoryByCharacter(userId, characterId);
  sendSuccess(res, 200, { inventory });
});

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const wallet = await InventoryService.getWallet(userId, characterId);
  sendSuccess(res, 200, { wallet });
});

export const useItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const itemId = requireString(req.params.itemId, "itemId");
  const result = await InventoryService.useItem(userId, characterId, itemId, req.body.note);
  sendSuccess(res, 200, { result }, "Item usado com sucesso.");
});

export const equipEquipment = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const equipmentId = requireString(req.params.equipmentId, "equipmentId");
  const equipment = await InventoryService.equipEquipment(userId, characterId, equipmentId);
  sendSuccess(res, 200, { equipment }, "Equipamento equipado com sucesso.");
});

export const unequipEquipment = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const characterId = requireString(req.params.characterId, "characterId");
  const equipmentId = requireString(req.params.equipmentId, "equipmentId");
  const equipment = await InventoryService.unequipEquipment(userId, characterId, equipmentId);
  sendSuccess(res, 200, { equipment }, "Equipamento desequipado com sucesso.");
});
