import type { BuyCartItemPayload, CartItemResponse } from "../api/cartApi";
import {
  initialQuantityDraft,
  quantityDraftText,
  toQuantityPayload,
  type QuantityDraft,
} from "./inventoryQuantity";

export function purchaseQuantityDraftFromCartItem(item: CartItemResponse): QuantityDraft {
  if (item.sourceType === "RECIPE") return initialQuantityDraft();
  if (item.unitType === "PERCENT") {
    return {
      ...initialQuantityDraft(),
      mode: "percent",
      percent: Math.min(100, Math.max(5, item.quantity ?? 100)),
    };
  }
  if (item.unitType === "CUSTOM") {
    return {
      ...initialQuantityDraft(),
      mode: "custom",
      customText: item.customQuantityText?.trim() || "",
    };
  }
  const unit = item.unit?.trim() || "개";
  if (unit !== "개") {
    return {
      ...initialQuantityDraft(),
      mode: "custom",
      customText: item.quantity && item.quantity > 0 ? `${item.quantity}${unit}` : "",
    };
  }
  return {
    ...initialQuantityDraft(),
    count: item.quantity && item.quantity > 0 ? item.quantity : 1,
    unit: "개",
  };
}

export function purchaseQuantityPayload(quantity: QuantityDraft): Omit<BuyCartItemPayload, "expirationDate" | "locationCategory"> {
  const payload = toQuantityPayload(quantity);
  return payload.unitType === "CUSTOM"
    ? { unitType: "CUSTOM", customQuantityText: payload.customQuantityText ?? "" }
    : {
        unitType: payload.unitType,
        quantity: payload.remainingQuantity ?? undefined,
        unit: payload.unit ?? undefined,
        countBasis: payload.countBasis,
        perCountQuantity: payload.perCountQuantity,
        perCountUnit: payload.perCountUnit,
        quantityNeedsReview: payload.quantityNeedsReview,
      };
}

export function purchaseQuantityText(quantity: QuantityDraft) {
  return quantityDraftText(quantity);
}
