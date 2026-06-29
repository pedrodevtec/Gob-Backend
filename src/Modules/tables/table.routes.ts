import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { validateCreateCharacter } from "../characters/character.schema";
import aiRoutes from "../ai/ai.routes";
import {
  applyCharacterTraitSuggestion,
  createCharacterTrait,
  createCharacterTraitSuggestion,
  createMissionSubmission,
  createTableCharacter,
  createTableMission,
  createTable,
  createTimelineEvent,
  deleteCharacterTrait,
  dismissCharacterTraitSuggestion,
  getMyTableCharacter,
  getTable,
  getTablesDashboard,
  getMasterOverview,
  getPlayerOverview,
  getTableMission,
  getTableWorld,
  joinTable,
  listCharacterTraits,
  listCharacterTraitSuggestions,
  listMissionSubmissions,
  listMyTableSubmissions,
  listTableSubmissions,
  listTableCharacters,
  listTableMissions,
  listTables,
  listTimelineEvents,
  reviewMissionSubmission,
  reviewTableCharacter,
  updateTableMission,
  upsertTableWorld,
} from "./table.controller";
import {
  validateCreateCharacterTrait,
  validateCreateCharacterTraitSuggestion,
  validateCreateMissionSubmission,
  validateCreateTable,
  validateCreateTableMission,
  validateCreateTimelineEvent,
  validateJoinTable,
  validateListCharacterTraits,
  validateListTableCharacters,
  validateListTableMissions,
  validateReviewMissionSubmission,
  validateReviewTableCharacter,
  validateListTableSubmissions,
  validateListTableTimeline,
  validateUpdateTableMission,
  validateUpsertTableWorld,
} from "./table.schema";

const router = Router();

router.use("/:tableId/ai", aiRoutes);
router.use(auth);

router.post("/", validate(validateCreateTable), createTable);
router.get("/", listTables);
router.get("/dashboard", getTablesDashboard);
router.get("/:id", getTable);
router.post("/join", validate(validateJoinTable), joinTable);
router.get("/:tableId/master/overview", getMasterOverview);
router.get("/:tableId/player/overview", getPlayerOverview);
router.post("/:tableId/characters", validate(validateCreateCharacter), createTableCharacter);
router.get("/:tableId/characters/me", getMyTableCharacter);
router.get(
  "/:tableId/characters",
  validate(validateListTableCharacters),
  listTableCharacters
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
