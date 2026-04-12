import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPvpMatch, getPvpOverview, getPvpRanking } from "./pvp.controller";
import { validateCreatePvpMatch } from "./pvp.schema";

const router = Router();

router.get("/rankings", auth, getPvpRanking);
router.get("/characters/:characterId/overview", auth, getPvpOverview);
router.post("/matches", auth, validate(validateCreatePvpMatch), createPvpMatch);

export default router;
