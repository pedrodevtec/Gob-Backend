import { Router } from "express";
import adminOnly from "../../middleware/admin";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createBounty,
  createMission,
  createMonster,
  createNpc,
  createTraining,
  listBounties,
  listMissions,
  listMonsters,
  listNpcs,
  listTrainings,
  updateBounty,
  updateMission,
  updateMonster,
  updateNpc,
  updateTraining,
} from "./admin.controller";
import {
  validateCreateBounty,
  validateCreateMission,
  validateCreateMonster,
  validateCreateNpc,
  validateCreateTraining,
  validateUpdateBounty,
  validateUpdateMission,
  validateUpdateMonster,
  validateUpdateNpc,
  validateUpdateTraining,
} from "./admin.schema";

const router = Router();

router.use(auth, adminOnly);

router.get("/monsters", listMonsters);
router.post("/monsters", validate(validateCreateMonster), createMonster);
router.patch("/monsters/:id", validate(validateUpdateMonster), updateMonster);

router.get("/bounties", listBounties);
router.post("/bounties", validate(validateCreateBounty), createBounty);
router.patch("/bounties/:id", validate(validateUpdateBounty), updateBounty);

router.get("/missions", listMissions);
router.post("/missions", validate(validateCreateMission), createMission);
router.patch("/missions/:id", validate(validateUpdateMission), updateMission);

router.get("/trainings", listTrainings);
router.post("/trainings", validate(validateCreateTraining), createTraining);
router.patch("/trainings/:id", validate(validateUpdateTraining), updateTraining);

router.get("/npcs", listNpcs);
router.post("/npcs", validate(validateCreateNpc), createNpc);
router.patch("/npcs/:id", validate(validateUpdateNpc), updateNpc);

export default router;
