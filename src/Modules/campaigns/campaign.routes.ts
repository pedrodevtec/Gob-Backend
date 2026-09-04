import { Router } from "express";
import adminOnly from "../../middleware/admin";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPublicCampaign,
  createOrResumeCampaignCharacterDraft,
  getCampaignOperationalOverview,
  getAdminCampaignBySlug,
  getFinalSurveyConfig,
  getMyFinalSurvey,
  getConsentDocument,
  getCampaignConsentDocument,
  getPublicCampaign,
  joinPublicCampaign,
  recordConsent,
  recordCampaignAnalyticsEvent,
  resumePublicCampaign,
  submitFinalSurvey,
  transitionPublicCampaign,
  updatePublicCampaign,
} from "./campaign.controller";
import {
  validateCampaignStatusTransition,
  validateCreatePublicCampaign,
  validateRecordConsent,
  validateUpdatePublicCampaign,
} from "./campaign.schema";
import {
  validateRecordAnalyticsEvent,
  validateSubmitFinalSurvey,
} from "./campaignPilot.schema";

const router = Router();

router.get("/public/consent", getConsentDocument);
router.get("/public/final-survey", getFinalSurveyConfig);
router.get("/public/:slug/final-survey/me", auth, getMyFinalSurvey);
router.put("/public/:slug/final-survey/me", auth, validate(validateSubmitFinalSurvey), submitFinalSurvey);
router.post("/public/:slug/events", auth, validate(validateRecordAnalyticsEvent), recordCampaignAnalyticsEvent);
router.get("/public/:slug", getPublicCampaign);
router.get("/public/:slug/consent", getCampaignConsentDocument);
router.get("/public/:slug/resume", auth, resumePublicCampaign);
router.post("/public/:slug/character-draft", auth, createOrResumeCampaignCharacterDraft);
router.post("/public/:slug/consent", auth, validate(validateRecordConsent), recordConsent);
router.post("/public/:slug/join", auth, joinPublicCampaign);

router.use("/admin", auth, adminOnly);
router.post("/admin", validate(validateCreatePublicCampaign), createPublicCampaign);
router.get("/admin/by-slug/:slug", getAdminCampaignBySlug);
router.get("/admin/:campaignId/operations", getCampaignOperationalOverview);
router.patch("/admin/:campaignId", validate(validateUpdatePublicCampaign), updatePublicCampaign);
router.post("/admin/:campaignId/status", validate(validateCampaignStatusTransition), transitionPublicCampaign);

export default router;
