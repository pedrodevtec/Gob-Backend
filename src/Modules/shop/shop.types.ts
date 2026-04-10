export interface PurchaseInput {
  characterId: string;
  productId: string;
  quantity: number;
}

export interface CreatePaymentOrderInput {
  characterId: string;
  productId: string;
  quantity: number;
  provider?: string;
}

export interface PaymentWebhookInput {
  orderId?: string;
  providerReference?: string;
  providerPaymentId?: string;
  status: "PAID" | "FAILED" | "CANCELED";
  failureReason?: string;
}
