import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  equipEquipment,
  getInventory,
  getWallet,
  unequipEquipment,
  useItem,
} from "./inventory.controller";
import { validateUseItem } from "./inventory.schema";

const router = Router();

router.use(auth);
router.get("/characters/:characterId", getInventory);
router.get("/characters/:characterId/wallet", getWallet);
router.post("/characters/:characterId/items/:itemId/use", validate(validateUseItem), useItem);
router.post("/characters/:characterId/equipments/:equipmentId/equip", equipEquipment);
router.post("/characters/:characterId/equipments/:equipmentId/unequip", unequipEquipment);

export default router;
