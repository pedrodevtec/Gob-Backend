import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { validateCreateCharacter } from "../characters/character.schema";
import {
  createCharacterTrait,
  createMissionSubmission,
  createTableCharacter,
  createTableMission,
  createTable,
  createTimelineEvent,
  deleteCharacterTrait,
  getTable,
  getTableMission,
  getTableWorld,
  joinTable,
  listCharacterTraits,
  listMissionSubmissions,
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
  validateCreateMissionSubmission,
  validateCreateTable,
  validateCreateTableMission,
  validateCreateTimelineEvent,
  validateJoinTable,
  validateReviewMissionSubmission,
  validateReviewTableCharacter,
  validateUpdateTableMission,
  validateUpsertTableWorld,
} from "./table.schema";

const router = Router();

router.use(auth);

router.post("/", validate(validateCreateTable), createTable);
router.get("/", listTables);
router.get("/:id", getTable);
router.post("/join", validate(validateJoinTable), joinTable);
router.post("/:tableId/characters", validate(validateCreateCharacter), createTableCharacter);
router.get("/:tableId/characters", listTableCharacters);
router.patch(
  "/:tableId/characters/:characterId/review",
  validate(validateReviewTableCharacter),
  reviewTableCharacter
);
router.get("/:tableId/characters/:characterId/traits", listCharacterTraits);
router.post(
  "/:tableId/characters/:characterId/traits",
  validate(validateCreateCharacterTrait),
  createCharacterTrait
);
router.delete("/:tableId/characters/:characterId/traits/:traitId", deleteCharacterTrait);
router.post("/:tableId/missions", validate(validateCreateTableMission), createTableMission);
router.get("/:tableId/missions", listTableMissions);
router.get("/:tableId/missions/:missionId", getTableMission);
router.patch("/:tableId/missions/:missionId", validate(validateUpdateTableMission), updateTableMission);
router.post(
  "/:tableId/missions/:missionId/submissions",
  validate(validateCreateMissionSubmission),
  createMissionSubmission
);
router.get("/:tableId/missions/:missionId/submissions", listMissionSubmissions);
router.patch(
  "/:tableId/missions/:missionId/submissions/:submissionId/review",
  validate(validateReviewMissionSubmission),
  reviewMissionSubmission
);
router.get("/:tableId/timeline", listTimelineEvents);
router.post("/:tableId/timeline", validate(validateCreateTimelineEvent), createTimelineEvent);
router.get("/:tableId/world", getTableWorld);
router.put("/:tableId/world", validate(validateUpsertTableWorld), upsertTableWorld);

export default router;
