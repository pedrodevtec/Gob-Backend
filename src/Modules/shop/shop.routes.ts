import { Router } from "express";
import auth from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPaymentOrder,
  getCatalog,
  listPaymentOrders,
  paymentWebhook,
  purchase,
} from "./shop.controller";
import {
  validateCreatePaymentOrder,
  validatePaymentWebhook,
  validatePurchase,
} from "./shop.schema";

const router = Router();

router.get("/catalog", getCatalog);
router.post("/purchases", auth, validate(validatePurchase), purchase);
router.get("/payment-orders", auth, listPaymentOrders);
router.post("/payment-orders", auth, validate(validateCreatePaymentOrder), createPaymentOrder);
router.post("/webhooks/payments", validate(validatePaymentWebhook), paymentWebhook);

export default router;
