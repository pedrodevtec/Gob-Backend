import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireString, requireUserId } from "../../utils/validation";
import { CampaignPilotService } from "./campaignPilot.service";
import { CampaignService } from "./campaign.service";

export const createPublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const campaign = await CampaignService.createPublicCampaign(userId, req.body);
  sendSuccess(res, 201, { campaign }, "Campanha publica criada com sucesso.");
});

export const updatePublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const campaignId = requireString(req.params.campaignId, "campaignId");
  const campaign = await CampaignService.updatePublicCampaign(userId, campaignId, req.body);
  sendSuccess(res, 200, { campaign }, "Campanha publica atualizada com sucesso.");
});

export const transitionPublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const campaignId = requireString(req.params.campaignId, "campaignId");
  const campaign = await CampaignService.transitionPublicCampaign(userId, campaignId, req.body);
  sendSuccess(res, 200, { campaign }, "Status da campanha atualizado com sucesso.");
});

export const getPublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const campaign = await CampaignService.getPublicLanding(slug);
  sendSuccess(res, 200, { campaign });
});

export const getAdminCampaignBySlug = asyncHandler(async (req: Request, res: Response) => {
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const campaign = await CampaignService.getAdminCampaignBySlug(slug);
  sendSuccess(res, 200, { campaign });
});

export const getConsentDocument = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, 200, { consentDocument: CampaignService.getConsentDocument() });
});

export const recordConsent = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const result = await CampaignService.recordConsent(userId, slug, req.body);
  sendSuccess(res, 200, result, "Consentimento registrado com sucesso.");
});

export const joinPublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const result = await CampaignService.joinPublicCampaign(userId, slug);
  sendSuccess(res, 200, result, "Entrada na campanha realizada com sucesso.");
});

export const resumePublicCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const resume = await CampaignService.resumePublicCampaign(userId, slug);
  sendSuccess(res, 200, { resume });
});

export const getFinalSurveyConfig = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, 200, { finalSurvey: CampaignPilotService.getFinalSurveyConfig() });
});

export const getMyFinalSurvey = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const finalSurveyResponse = await CampaignPilotService.getMyFinalSurvey(userId, slug);
  sendSuccess(res, 200, { finalSurveyResponse });
});

export const submitFinalSurvey = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const finalSurveyResponse = await CampaignPilotService.submitFinalSurvey(userId, slug, req.body);
  sendSuccess(res, 200, { finalSurveyResponse }, "Pesquisa final registrada com sucesso.");
});

export const recordCampaignAnalyticsEvent = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const slug = requireString(req.params.slug, "slug", 3, 80);
  const analyticsEvent = await CampaignPilotService.recordCampaignEvent(userId, slug, req.body);
  sendSuccess(res, 201, { analyticsEvent }, "Evento registrado com sucesso.");
});

export const getCampaignOperationalOverview = asyncHandler(async (req: Request, res: Response) => {
  const campaignId = requireString(req.params.campaignId, "campaignId");
  const operationalOverview = await CampaignPilotService.getOperationalOverview(campaignId);
  sendSuccess(res, 200, { operationalOverview });
});
