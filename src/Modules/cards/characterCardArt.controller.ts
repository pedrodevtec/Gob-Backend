import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { CharacterCardArtService } from "./characterCardArt.service";

export const previewCharacterCardArtPrompt = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const tableId = requireString(req.params.tableId, "tableId");
  const characterId = requireString(req.params.characterId, "characterId");
  const preview = await CharacterCardArtService.previewSubmittedCharacterArtPrompt(
    userId,
    tableId,
    characterId,
    req.body?.variant
  );
  sendSuccess(res, 200, { preview });
});

export const listCharacterCardArt = asyncHandler(async (req: Request, res: Response) => {
  const result = await CharacterCardArtService.listGenerations(
    requireUserId(req),
    requireString(req.params.tableId, "tableId"),
    requireString(req.params.characterId, "characterId")
  );
  sendSuccess(res, 200, { generations: result });
});

export const generateCharacterCardArt = asyncHandler(async (req: Request, res: Response) => {
  const generation = await CharacterCardArtService.generate(
    requireUserId(req),
    requireString(req.params.tableId, "tableId"),
    requireString(req.params.characterId, "characterId"),
    req.body?.variant
  );
  sendSuccess(res, 201, { generation }, "Imagem do personagem gerada com sucesso.");
});

export const getCharacterCardArtContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await CharacterCardArtService.getGenerationContent(
    requireUserId(req),
    requireString(req.params.tableId, "tableId"),
    requireString(req.params.characterId, "characterId"),
    requireString(req.params.generationId, "generationId")
  );
  res.setHeader("Content-Type", content.mimeType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).send(content.data);
});
