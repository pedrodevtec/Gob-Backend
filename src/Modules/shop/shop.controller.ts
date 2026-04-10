import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/http";
import { requireUserId } from "../../utils/validation";
import { ShopService } from "./shop.service";

export const getCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const catalog = await ShopService.getCatalog();
  sendSuccess(res, 200, { catalog });
});

export const purchase = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const result = await ShopService.purchaseWithCoins(userId, req.body);
  sendSuccess(res, 201, result, "Compra realizada com sucesso.");
});

export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const order = await ShopService.createPaymentOrder(userId, req.body);
  sendSuccess(res, 201, { order }, "Pedido de pagamento criado com sucesso.");
});

export const listPaymentOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const orders = await ShopService.getPaymentOrders(userId);
  sendSuccess(res, 200, { orders });
});

export const paymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.header("x-webhook-secret") ?? undefined;
  const order = await ShopService.processPaymentWebhook(signature, req.body);
  sendSuccess(res, 200, { order }, "Webhook processado com sucesso.");
});
