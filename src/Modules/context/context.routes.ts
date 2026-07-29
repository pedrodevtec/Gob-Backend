import { Router } from "express";
import adminOnly from "../../middleware/admin";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  addContextUnit,
  archiveContextVersion,
  createContextVersion,
  createEpisode,
  createSetting,
  getActivePublicContext,
  getAuthorizedContextVersion,
  getPublicContextUnit,
  getPublicContextVersion,
  listContextVersions,
  publishContextVersion,
} from "./context.controller";
import {
  validateAddContextUnit,
  validateCreateContextVersion,
  validateCreateEpisode,
  validateCreateSetting,
} from "./context.schema";

const router = Router();

router.get(
  "/settings/:settingStableKey/episodes/:episodeStableKey/active-public",
  getActivePublicContext
);
router.get("/versions/:id/public", getPublicContextVersion);
router.get("/units/:id/public", getPublicContextUnit);

router.use("/admin", auth, adminOnly);
router.post("/admin/settings", validate(validateCreateSetting), createSetting);
router.post("/admin/episodes", validate(validateCreateEpisode), createEpisode);
router.post("/admin/versions", validate(validateCreateContextVersion), createContextVersion);
router.post("/admin/units", validate(validateAddContextUnit), addContextUnit);
router.post("/admin/versions/:id/publish", publishContextVersion);
router.post("/admin/versions/:id/archive", archiveContextVersion);
router.get("/admin/versions", listContextVersions);
router.get("/admin/versions/:id", getAuthorizedContextVersion);

export default router;
