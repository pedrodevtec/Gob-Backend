export interface TradeAssetInput {
  assetType: "ITEM" | "EQUIPMENT";
  assetId: string;
  quantity?: number;
}

export interface CreateTradeRequestInput {
  requesterCharacterId: string;
  targetCharacterId: string;
  offeredCoins?: number;
  requestedCoins?: number;
  note?: string;
  expiresInHours?: number;
  offeredAssets?: TradeAssetInput[];
  requestedAssets?: TradeAssetInput[];
}

export interface RespondTradeRequestInput {
  action: "ACCEPT" | "REJECT" | "CANCEL";
}
