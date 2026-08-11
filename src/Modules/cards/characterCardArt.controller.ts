import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { CharacterCardArtService } from "./characterCardArt.service";

export const previewCharacterCardArtPrompt = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const preview = await CharacterCardArtService.previewApprovedCharacterArtPrompt(userId, tableId, characterId);
  sendSuccess(res, 200, { preview });
});
