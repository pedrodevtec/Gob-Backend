import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { validateCreateCharacter } from "../characters/character.schema";
import {
  createTableCharacter,
  createTable,
  getTable,
  getTableWorld,
  joinTable,
  listTableCharacters,
  listTables,
  reviewTableCharacter,
  upsertTableWorld,
} from "./table.controller";
import {
  validateCreateTable,
  validateJoinTable,
  validateReviewTableCharacter,
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
router.get("/:tableId/world", getTableWorld);
router.put("/:tableId/world", validate(validateUpsertTableWorld), upsertTableWorld);

export default router;
