import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  abandonMissionJourney,
  executeCombatTurn,
  executeBountyHunt,
  executeMarketAction,
  executeMission,
  executeNpcInteraction,
  executeTraining,
  getMissionSession,
  getJourneyOptions,
  listBounties,
  listMissionSessions,
  listMissions,
  listMonsters,
  listNpcs,
  progressMissionJourney,
  startMissionJourney,
  listTrainings,
} from "./gameplay.controller";
import {
  validateBountyHunt,
  validateCombatTurn,
  validateMarketAction,
  validateMission,
  validateNpcInteraction,
  validateProgressMissionJourney,
  validateStartMissionJourney,
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

router.get("/characters/:characterId/missions/sessions", listMissionSessions);
router.get("/characters/:characterId/missions/sessions/:sessionId", getMissionSession);
router.post(
  "/characters/:characterId/missions/start",
  validate(validateStartMissionJourney),
  startMissionJourney
);
router.post(
  "/characters/:characterId/missions/sessions/:sessionId/progress",
  validate(validateProgressMissionJourney),
  progressMissionJourney
);
router.post(
  "/characters/:characterId/missions/sessions/:sessionId/abandon",
  abandonMissionJourney
);

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
router.post(
  "/characters/:characterId/combat-sessions/:combatSessionId/actions",
  validate(validateCombatTurn),
  executeCombatTurn
);

export default router;
