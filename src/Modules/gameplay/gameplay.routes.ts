import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  executeBountyHunt,
  executeMarketAction,
  executeMission,
  executeNpcInteraction,
  executeTraining,
  getJourneyOptions,
  listBounties,
  listMissions,
  listMonsters,
  listNpcs,
  listTrainings,
} from "./gameplay.controller";
import {
  validateBountyHunt,
  validateMarketAction,
  validateMission,
  validateNpcInteraction,
  validateTraining,
} from "./gameplay.schema";

const router = Router();

router.get("/journey", getJourneyOptions);
router.get("/monsters", listMonsters);
router.get("/bounties", listBounties);
router.get("/missions", listMissions);
router.get("/trainings", listTrainings);
router.get("/npcs", listNpcs);

router.use(auth);

router.post(
  "/characters/:characterId/actions/bounty-hunt",
  validate(validateBountyHunt),
  executeBountyHunt
);
router.post(
  "/characters/:characterId/actions/missions",
  validate(validateMission),
  executeMission
);
router.post(
  "/characters/:characterId/actions/training",
  validate(validateTraining),
  executeTraining
);
router.post(
  "/characters/:characterId/actions/npc-interaction",
  validate(validateNpcInteraction),
  executeNpcInteraction
);
router.post(
  "/characters/:characterId/actions/market",
  validate(validateMarketAction),
  executeMarketAction
);

export default router;
