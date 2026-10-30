import type { BuyCartItemPayload, CartItemResponse } from "../api/cartApi";
import {
  initialQuantityDraft,
  quantityDraftText,
  quantityDraftFromInventory,
  toQuantityPayload,
  type QuantityDraft,
} from "./inventoryQuantity";

export function purchaseQuantityDraftFromCartItem(item: CartItemResponse): QuantityDraft {
  if (item.sourceType === "RECIPE") return initialQuantityDraft();
  return quantityDraftFromInventory({
    unitType: item.unitType ?? "QUANTITY",
    remainingQuantity: item.quantity ?? (item.unitType === "PERCENT" ? 100 : 1),
    unit: item.unit,
    customQuantityText: item.customQuantityText,
  });
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
