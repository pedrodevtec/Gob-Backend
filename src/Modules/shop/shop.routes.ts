import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPaymentOrder,
  getCatalog,
  getMarketOverview,
  listPaymentOrders,
  marketPurchase,
  marketSell,
  paymentWebhook,
  purchase,
} from "./shop.controller";
import {
  validateCreatePaymentOrder,
  validateMarketSale,
  validatePaymentWebhook,
  validatePurchase,
} from "./shop.schema";

const router = Router();

router.get("/catalog", getCatalog);
router.get("/market/characters/:characterId", auth, getMarketOverview);
router.post("/market/purchases", auth, validate(validatePurchase), marketPurchase);
router.post("/market/sales", auth, validate(validateMarketSale), marketSell);
router.post("/purchases", auth, validate(validatePurchase), purchase);
router.get("/payment-orders", auth, listPaymentOrders);
router.post("/payment-orders", auth, validate(validateCreatePaymentOrder), createPaymentOrder);
router.post("/webhooks/payments", validate(validatePaymentWebhook), paymentWebhook);

export default router;
