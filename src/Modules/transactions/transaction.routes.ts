import { Router } from "express";
import auth from "../../middleware/auth";
import { getTransactionsByCharacter } from "./transaction.controller";

const router = Router();

router.use(auth);
router.get("/characters/:characterId", getTransactionsByCharacter);

export default router;
