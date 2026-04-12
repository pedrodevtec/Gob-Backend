import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createTradeRequest, listTrades, respondTradeRequest } from "./trade.controller";
import { validateCreateTradeRequest, validateRespondTradeRequest } from "./trade.schema";

const router = Router();

router.get("/characters/:characterId", auth, listTrades);
router.post("/requests", auth, validate(validateCreateTradeRequest), createTradeRequest);
router.post("/:tradeId/respond", auth, validate(validateRespondTradeRequest), respondTradeRequest);

export default router;
