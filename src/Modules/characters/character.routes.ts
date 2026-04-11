import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createCharacter,
  deleteCharacter,
  getCharacterById,
  getPublicCharacterProfile,
  getCharacterRankings,
  getCharacterSummary,
  getCharacters,
  listClasses,
  updateCharacter,
  updateCharacterPosition,
  updateCharacterProgress,
} from "./character.controller";
import {
  validateCreateCharacter,
  validateUpdateCharacterPosition,
  validateUpdateCharacterProfile,
  validateUpdateCharacterProgress,
} from "./character.schema";

const router = Router();

router.use(auth);

router.get("/classes", listClasses);
router.get("/", getCharacters);
router.get("/rankings", getCharacterRankings);
router.get("/:id/public-profile", getPublicCharacterProfile);
router.post("/", validate(validateCreateCharacter), createCharacter);
router.post("/create", validate(validateCreateCharacter), createCharacter);
router.get("/:id", getCharacterById);
router.get("/:id/summary", getCharacterSummary);
router.put("/:id", validate(validateUpdateCharacterProfile), updateCharacter);
router.patch("/:id/progress", validate(validateUpdateCharacterProgress), updateCharacterProgress);
router.patch("/:id/position", validate(validateUpdateCharacterPosition), updateCharacterPosition);
router.delete("/:id", deleteCharacter);

export default router;
