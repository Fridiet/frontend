import type { InventoryItem } from "../types/fridge";
import { isUsableInventory } from "./inventoryAvailability";

export function getUrgentIngredient(items: InventoryItem[]) {
  return items
    .filter((item) => isUsableInventory(item) && item.dDay !== null && item.dDay >= 0 && item.dDay <= 3)
    .sort((a, b) => (a.dDay ?? 0) - (b.dDay ?? 0))[0] ?? null;
}

export function inventoryCompositionFingerprint(fridgeId: number | undefined, items: InventoryItem[]) {
  const parts = items
    .filter(isUsableInventory)
    .map((item) => [
      item.batchId,
      item.ingredientName.trim(),
      item.unitType,
      item.remainingQuantity ?? "",
      item.customQuantityText ?? "",
      item.unit ?? "",
      item.consumeByDate ?? "",
      item.locationCategory,
      item.status,
    ].join(":"))
    .sort();
  return `${fridgeId ?? "none"}|${parts.join("|")}`;
}

export function homeRecommendationFingerprint(fridgeId: number | undefined, urgentBatchId: number | undefined, items: InventoryItem[]) {
  if (!fridgeId || !items.some(isUsableInventory)) return "";
  return `${inventoryCompositionFingerprint(fridgeId, items)}|urgent:${urgentBatchId ?? "none"}`;
}
