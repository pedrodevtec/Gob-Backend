import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { claimReward, listRewardClaims } from "./rewards.controller";
import { validateClaimReward } from "./rewards.schema";

const router = Router();

router.use(auth);
router.post("/claim", validate(validateClaimReward), claimReward);
router.get("/characters/:characterId", listRewardClaims);

export default router;
