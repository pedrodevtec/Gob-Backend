import { Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  decidePlayerAiSuggestion,
  suggestPlayerCharacterHelp,
} from "./playerAi.controller";
import {
  validateDecidePlayerAiSuggestion,
  validatePlayerCharacterAssistant,
} from "./playerAi.schema";

const router = Router({ mergeParams: true });
const playerAiRateLimiter = createRateLimiter(12, 60_000, {
  scope: "tables-player-ai",
  keyGenerator: (req) =>
    `${req.user?.id ?? req.ip ?? "unknown"}:${req.params.tableId ?? "unknown-table"}`,
});

router.use(auth);
router.use(playerAiRateLimiter);
router.post(
  "/character-help",
  validate(validatePlayerCharacterAssistant),
  suggestPlayerCharacterHelp
);
router.patch(
  "/suggestions/:suggestionId/decision",
  validate(validateDecidePlayerAiSuggestion),
  decidePlayerAiSuggestion
);

export default router;
