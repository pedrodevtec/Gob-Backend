import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createTable,
  getTable,
  getTableWorld,
  joinTable,
  listTables,
  upsertTableWorld,
} from "./table.controller";
import {
  validateCreateTable,
  validateJoinTable,
  validateUpsertTableWorld,
} from "./table.schema";

const router = Router();

router.use(auth);

router.post("/", validate(validateCreateTable), createTable);
router.get("/", listTables);
router.get("/:id", getTable);
router.post("/join", validate(validateJoinTable), joinTable);
router.get("/:tableId/world", getTableWorld);
router.put("/:tableId/world", validate(validateUpsertTableWorld), upsertTableWorld);

export default router;
