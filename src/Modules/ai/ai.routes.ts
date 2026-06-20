import { Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  suggestMissionIdeas,
  suggestTimelineSummary,
  suggestTraits,
  suggestWorldSummary,
} from "./ai.controller";
import {
  validateMissionIdeas,
  validateTimelineSummary,
  validateTraitSuggestions,
  validateWorldSummarySuggestion,
} from "./ai.schema";
import { aiMasterOnly } from "./ai.middleware";

const router = Router({ mergeParams: true });
const aiRateLimiter = createRateLimiter(12, 60_000, {
  scope: "tables-ai",
  keyGenerator: (req) =>
    `${req.user?.id ?? req.ip ?? "unknown"}:${req.params.tableId ?? "unknown-table"}`,
});

router.use(auth);
router.use(aiRateLimiter);
router.use(aiMasterOnly);
router.post("/world-summary", validate(validateWorldSummarySuggestion), suggestWorldSummary);
router.post("/mission-ideas", validate(validateMissionIdeas), suggestMissionIdeas);
router.post("/traits", validate(validateTraitSuggestions), suggestTraits);
router.post("/timeline-summary", validate(validateTimelineSummary), suggestTimelineSummary);

export default router;
