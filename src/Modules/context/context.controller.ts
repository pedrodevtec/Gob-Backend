import { ContextLayer } from "@prisma/client";
import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { ContextService } from "./context.service";

export const createSetting = asyncHandler(async (req: Request, res: Response) => {
  const setting = await ContextService.createSetting(requireUserId(req), req.body);
  sendSuccess(res, 201, { setting }, "Setting criado com sucesso.");
});

export const createEpisode = asyncHandler(async (req: Request, res: Response) => {
  const episode = await ContextService.createEpisode(requireUserId(req), req.body);
  sendSuccess(res, 201, { episode }, "Episodio criado com sucesso.");
});

export const createContextVersion = asyncHandler(async (req: Request, res: Response) => {
  const contextVersion = await ContextService.createContextVersion(requireUserId(req), req.body);
  sendSuccess(res, 201, { contextVersion }, "Versao de contexto criada com sucesso.");
});

export const addContextUnit = asyncHandler(async (req: Request, res: Response) => {
  const contextUnit = await ContextService.addContextUnit(requireUserId(req), req.body);
  sendSuccess(res, 201, { contextUnit }, "Unidade de contexto criada com sucesso.");
});

export const publishContextVersion = asyncHandler(async (req: Request, res: Response) => {
  const versionId = requireString(req.params.id, "id");
  const contextVersion = await ContextService.publishContextVersion(requireUserId(req), versionId);
  sendSuccess(res, 200, { contextVersion }, "Versao de contexto publicada com sucesso.");
});

export const archiveContextVersion = asyncHandler(async (req: Request, res: Response) => {
  const versionId = requireString(req.params.id, "id");
  const contextVersion = await ContextService.archiveContextVersion(requireUserId(req), versionId);
  sendSuccess(res, 200, { contextVersion }, "Versao de contexto arquivada com sucesso.");
});

export const listContextVersions = asyncHandler(async (_req: Request, res: Response) => {
  const versions = await ContextService.listVersions();
  sendSuccess(res, 200, { versions });
});

export const getAuthorizedContextVersion = asyncHandler(async (req: Request, res: Response) => {
  const versionId = requireString(req.params.id, "id");
  const contextVersion = await ContextService.getAuthorizedVersion(versionId);
  sendSuccess(res, 200, { contextVersion });
});

export const getActivePublicContext = asyncHandler(async (req: Request, res: Response) => {
  const settingStableKey = requireString(req.params.settingStableKey, "settingStableKey");
  const episodeStableKey = requireString(req.params.episodeStableKey, "episodeStableKey");
  const context = await ContextService.getActivePublicContext({
    settingStableKey,
    episodeStableKey,
    layer: ContextLayer.EPISODE,
  });
  sendSuccess(res, 200, { context });
});

export const getPublicContextVersion = asyncHandler(async (req: Request, res: Response) => {
  const versionId = requireString(req.params.id, "id");
  const context = await ContextService.getPublicVersion(versionId);
  sendSuccess(res, 200, { context });
});

export const getPublicContextUnit = asyncHandler(async (req: Request, res: Response) => {
  const unitId = requireString(req.params.id, "id");
  const unit = await ContextService.getPublicUnit(unitId);
  sendSuccess(res, 200, { unit });
});
