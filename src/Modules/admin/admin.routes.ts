import { Router } from "express";
import adminOnly from "../../middleware/admin";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createBounty,
  createMission,
  createMonster,
  createNpc,
  createShopProduct,
  createTraining,
  deleteBounty,
  deleteMission,
  deleteMonster,
  deleteNpc,
  deleteShopProduct,
  deleteTraining,
  listBounties,
  listMissions,
  listMonsters,
  listNpcs,
  listShopProducts,
  listTrainings,
  updateBounty,
  updateMission,
  updateMonster,
  updateNpc,
  updateShopProduct,
  updateTraining,
} from "./admin.controller";
import {
  validateCreateBounty,
  validateCreateMission,
  validateCreateMonster,
  validateCreateNpc,
  validateCreateShopProduct,
  validateCreateTraining,
  validateUpdateBounty,
  validateUpdateMission,
  validateUpdateMonster,
  validateUpdateNpc,
  validateUpdateShopProduct,
  validateUpdateTraining,
} from "./admin.schema";

const router = Router();

router.use(auth, adminOnly);

router.get("/monsters", listMonsters);
router.post("/monsters", validate(validateCreateMonster), createMonster);
router.patch("/monsters/:id", validate(validateUpdateMonster), updateMonster);
router.delete("/monsters/:id", deleteMonster);

router.get("/bounties", listBounties);
router.post("/bounties", validate(validateCreateBounty), createBounty);
router.patch("/bounties/:id", validate(validateUpdateBounty), updateBounty);
router.delete("/bounties/:id", deleteBounty);

router.get("/missions", listMissions);
router.post("/missions", validate(validateCreateMission), createMission);
router.patch("/missions/:id", validate(validateUpdateMission), updateMission);
router.delete("/missions/:id", deleteMission);

router.get("/trainings", listTrainings);
router.post("/trainings", validate(validateCreateTraining), createTraining);
router.patch("/trainings/:id", validate(validateUpdateTraining), updateTraining);
router.delete("/trainings/:id", deleteTraining);

router.get("/npcs", listNpcs);
router.post("/npcs", validate(validateCreateNpc), createNpc);
router.patch("/npcs/:id", validate(validateUpdateNpc), updateNpc);
router.delete("/npcs/:id", deleteNpc);

router.get("/shop-products", listShopProducts);
router.post("/shop-products", validate(validateCreateShopProduct), createShopProduct);
router.patch("/shop-products/:id", validate(validateUpdateShopProduct), updateShopProduct);
router.delete("/shop-products/:id", deleteShopProduct);

export default router;
