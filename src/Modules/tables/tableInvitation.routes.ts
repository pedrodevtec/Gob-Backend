import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { acceptTableInvitation } from "./table.controller";
import { validateAcceptTableInvitation } from "./table.schema";

const router = Router();

router.use(auth);
router.post("/accept", validate(validateAcceptTableInvitation), acceptTableInvitation);

export default router;
