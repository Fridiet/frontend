import type { InventoryItem } from "../types/fridge";

export function isUsableInventory(item: InventoryItem) {
  return !item.isConsumed && item.status !== "CONSUMED" && item.status !== "REMOVED" && item.status !== "DISCARDED";
}

export function usableInventories(items: InventoryItem[]) {
  return items.filter(isUsableInventory);
}
