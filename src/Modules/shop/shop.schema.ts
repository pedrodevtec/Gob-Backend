import { Request } from "express";
import { AppError } from "../../errors/AppError";
import { getBody, optionalString, requirePositiveInt, requireString } from "../../utils/validation";
import {
  CreatePaymentOrderInput,
  MarketSaleInput,
  PaymentWebhookInput,
  PurchaseInput,
} from "./shop.types";

const requireEnumValue = <T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T => {
  const normalized = requireString(value, fieldName, 1, 50).toUpperCase() as T;

  if (!allowedValues.includes(normalized)) {
    throw new AppError(
      400,
      `Campo ${fieldName} deve ser um dos valores: ${allowedValues.join(", ")}.`,
      "VALIDATION_ERROR"
    );
  }

  return normalized;
};

export const validatePurchase = (req: Request): void => {
  const body = getBody(req);
  const parsed: PurchaseInput = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    productId: requireString(body.productId, "productId", 1, 80),
    quantity: requirePositiveInt(body.quantity, "quantity", { min: 1, max: 99 }),
  };

  req.body = parsed;
};

export const validateMarketSale = (req: Request): void => {
  const body = getBody(req);
  const parsed: MarketSaleInput = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    assetType: requireEnumValue(body.assetType, "assetType", ["ITEM", "EQUIPMENT"]),
    assetId: requireString(body.assetId, "assetId", 1, 80),
    quantity: requirePositiveInt(body.quantity, "quantity", { min: 1, max: 999 }),
  };

  req.body = parsed;
};

export const validateCreatePaymentOrder = (req: Request): void => {
  const body = getBody(req);
  const parsed: CreatePaymentOrderInput = {
    characterId: requireString(body.characterId, "characterId", 1, 80),
    productId: requireString(body.productId, "productId", 1, 80),
    quantity: requirePositiveInt(body.quantity, "quantity", { min: 1, max: 99 }),
    provider: optionalString(body.provider, "provider", 2, 50),
  };

  req.body = parsed;
};

export const validatePaymentWebhook = (req: Request): void => {
  const body = getBody(req);
  const status = requireString(body.status, "status", 4, 20).toUpperCase();

  if (!["PAID", "FAILED", "CANCELED"].includes(status)) {
    throw new AppError(400, "Status de webhook invalido.", "VALIDATION_ERROR");
  }

  const parsed: PaymentWebhookInput = {
    orderId: optionalString(body.orderId, "orderId", 1, 80),
    providerReference: optionalString(body.providerReference, "providerReference", 1, 120),
    providerPaymentId: optionalString(body.providerPaymentId, "providerPaymentId", 1, 120),
    status: status as PaymentWebhookInput["status"],
    failureReason: optionalString(body.failureReason, "failureReason", 1, 255),
  };

  if (!parsed.orderId && !parsed.providerReference) {
    throw new AppError(
      400,
      "Webhook deve informar orderId ou providerReference.",
      "VALIDATION_ERROR"
    );
  }

  req.body = parsed;
};
