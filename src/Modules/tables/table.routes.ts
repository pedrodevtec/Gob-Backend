import { Router } from "express";
import auth from "../../middleware/auth";
import { createRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import aiRoutes from "../ai/ai.routes";
import playerAiRoutes from "../ai/playerAi.routes";
import {
  decideCharacterAiSuggestion,
  suggestCharacterChapter,
  suggestCharacterMechanics,
} from "../ai/playerAi.controller";
import {
  approveTableCharacter,
  adaptLegacyTableCharacter,
  applyCharacterTraitSuggestion,
  createCharacterTrait,
  createCharacterTraitSuggestion,
  createMissionSubmission,
  createTableCharacter,
  createTableInvitation,
  createTableMission,
  createTable,
  createTimelineEvent,
  deleteCharacterTrait,
  deletePilotTableCharacter,
  dismissCharacterTraitSuggestion,
  getMyTableCharacter,
  getTableCharacter,
  getTableMasterContext,
  getTablePlayerContext,
  getTable,
  getTablesDashboard,
  getMasterOverview,
  getPlayerOverview,
  getTableMission,
  getTableWorld,
  joinTable,
  listTableInvitations,
  listTableMembers,
  listTableCharacterReviewEvents,
  listTableCharacterReviews,
  listCharacterTraits,
  listCharacterTraitSuggestions,
  listMissionSubmissions,
  listMyTableSubmissions,
  listTableSubmissions,
  listTableCharacters,
  listTableMissions,
  listTables,
  listTimelineEvents,
  requestTableCharacterChanges,
  reviewMissionSubmission,
  reviewTableCharacter,
  revokeTableInvitation,
  submitTableCharacter,
  updateTableCharacter,
  updateTableMission,
  updateTable,
  upsertTableCharacterEpisodeAnswers,
  upsertTableWorld,
} from "./table.controller";
import {
  validateCreateTableInvitation,
  validateDeletePilotCharacter,
  validateCreatePackage03Character,
  validateCreateCharacterTrait,
  validateCreateCharacterTraitSuggestion,
  validateCreateMissionSubmission,
  validateCreateTable,
  validateCreateTableMission,
  validateCreateTimelineEvent,
  validateJoinTable,
  validateUpdateTable,
  validateListCharacterTraits,
  validateListTableCharacters,
  validateListTableMissions,
  validateReviewMissionSubmission,
  validateReviewTableCharacter,
  validateListTableSubmissions,
  validateListTableTimeline,
  validateReviewPackage03Character,
  validateUpdatePackage03Character,
  validateUpdateTableMission,
  validateUpsertCharacterEpisodeAnswers,
  validateUpsertTableWorld,
} from "./table.schema";
import {
  validateCharacterChapterSuggestions,
  validateCharacterMechanicalProposal,
  validateDecidePlayerAiSuggestion,
} from "../ai/playerAi.schema";
import { previewCharacterCardArtPrompt } from "../cards/characterCardArt.controller";

const router = Router();
const characterAiRateLimiter = createRateLimiter(12, 60_000, {
  scope: "tables-character-ai",
  keyGenerator: (req) =>
    `${req.user?.id ?? req.ip ?? "unknown"}:${req.params.tableId ?? "unknown-table"}`,
});

router.use("/:tableId/ai", aiRoutes);
router.use("/:tableId/player-ai", playerAiRoutes);
router.use(auth);

router.post("/", validate(validateCreateTable), createTable);
router.get("/", listTables);
router.get("/dashboard", getTablesDashboard);
router.post("/join", validate(validateJoinTable), joinTable);
router.patch("/:tableId", validate(validateUpdateTable), updateTable);
router.get("/:tableId/members", listTableMembers);
router.post("/:tableId/invitations", validate(validateCreateTableInvitation), createTableInvitation);
router.get("/:tableId/invitations", listTableInvitations);
router.post("/:tableId/invitations/:invitationId/revoke", revokeTableInvitation);
router.get("/:tableId/context/player", getTablePlayerContext);
router.get("/:tableId/context/master", getTableMasterContext);
router.get("/:id", getTable);
router.get("/:tableId/master/overview", getMasterOverview);
router.get("/:tableId/player/overview", getPlayerOverview);
router.post("/:tableId/characters", validate(validateCreatePackage03Character), createTableCharacter);
router.get("/:tableId/characters/me", getMyTableCharacter);
router.get("/:tableId/character-reviews", listTableCharacterReviews);
router.get(
  "/:tableId/characters",
  validate(validateListTableCharacters),
  listTableCharacters
);
router.get("/:tableId/characters/:characterId", getTableCharacter);
router.patch(
  "/:tableId/characters/:characterId",
  validate(validateUpdatePackage03Character),
  updateTableCharacter
);
router.patch(
  "/:tableId/characters/:characterId/episode-answers",
  validate(validateUpsertCharacterEpisodeAnswers),
  upsertTableCharacterEpisodeAnswers
);
router.post("/:tableId/characters/:characterId/submit", submitTableCharacter);
router.post(
  "/:tableId/characters/:characterId/ai/chapter-suggestions",
  characterAiRateLimiter,
  validate(validateCharacterChapterSuggestions),
  suggestCharacterChapter
);
router.post(
  "/:tableId/characters/:characterId/ai/mechanical-proposal",
  characterAiRateLimiter,
  validate(validateCharacterMechanicalProposal),
  suggestCharacterMechanics
);
router.patch(
  "/:tableId/characters/:characterId/ai/suggestions/:suggestionId",
  validate(validateDecidePlayerAiSuggestion),
  decideCharacterAiSuggestion
);
router.post(
  "/:tableId/characters/:characterId/card-art-prompt/preview",
  previewCharacterCardArtPrompt
);
router.get("/:tableId/characters/:characterId/reviews", listTableCharacterReviewEvents);
router.post(
  "/:tableId/characters/:characterId/request-changes",
  validate(validateReviewPackage03Character),
  requestTableCharacterChanges
);
router.post(
  "/:tableId/characters/:characterId/approve",
  validate(validateReviewPackage03Character),
  approveTableCharacter
);
router.post(
  "/:tableId/characters/:characterId/adapt-legacy",
  adaptLegacyTableCharacter
);
router.delete(
  "/:tableId/characters/:characterId",
  validate(validateDeletePilotCharacter),
  deletePilotTableCharacter
);
router.patch(
  "/:tableId/characters/:characterId/review",
  validate(validateReviewTableCharacter),
  reviewTableCharacter
);
router.get(
  "/:tableId/characters/:characterId/traits",
  validate(validateListCharacterTraits),
  listCharacterTraits
);
router.post(
  "/:tableId/characters/:characterId/traits",
  validate(validateCreateCharacterTrait),
  createCharacterTrait
);
router.get(
  "/:tableId/characters/:characterId/trait-suggestions",
  listCharacterTraitSuggestions
);
router.post(
  "/:tableId/characters/:characterId/trait-suggestions",
  validate(validateCreateCharacterTraitSuggestion),
  createCharacterTraitSuggestion
);
router.patch(
  "/:tableId/characters/:characterId/trait-suggestions/:suggestionId/apply",
  applyCharacterTraitSuggestion
);
router.patch(
  "/:tableId/characters/:characterId/trait-suggestions/:suggestionId/dismiss",
  dismissCharacterTraitSuggestion
);
router.delete("/:tableId/characters/:characterId/traits/:traitId", deleteCharacterTrait);
router.post("/:tableId/missions", validate(validateCreateTableMission), createTableMission);
router.get(
  "/:tableId/missions",
  validate(validateListTableMissions),
  listTableMissions
);
router.get("/:tableId/missions/:missionId", getTableMission);
router.patch("/:tableId/missions/:missionId", validate(validateUpdateTableMission), updateTableMission);
router.post(
  "/:tableId/missions/:missionId/submissions",
  validate(validateCreateMissionSubmission),
  createMissionSubmission
);
router.get("/:tableId/missions/:missionId/submissions", listMissionSubmissions);
router.get(
  "/:tableId/submissions/me",
  validate(validateListTableSubmissions),
  listMyTableSubmissions
);
router.get(
  "/:tableId/submissions",
  validate(validateListTableSubmissions),
  listTableSubmissions
);
router.patch(
  "/:tableId/missions/:missionId/submissions/:submissionId/review",
  validate(validateReviewMissionSubmission),
  reviewMissionSubmission
);
router.get(
  "/:tableId/timeline",
  validate(validateListTableTimeline),
  listTimelineEvents
);
router.post("/:tableId/timeline", validate(validateCreateTimelineEvent), createTimelineEvent);
router.get("/:tableId/world", getTableWorld);
router.put("/:tableId/world", validate(validateUpsertTableWorld), upsertTableWorld);

export default router;
