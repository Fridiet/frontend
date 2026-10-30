import type { AddCartItemPayload } from "../api/cartApi";

export function parseQuantityText(value: string): Omit<AddCartItemPayload, "itemName"> {
  const normalized = value.trim();

  if (!normalized) {
    return { unitType: "QUANTITY", quantity: 1, unit: "개" };
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([^\d]*)$/);
  if (!match) {
    return { unitType: "CUSTOM", customQuantityText: normalized };
  }

  return {
    unitType: "QUANTITY",
    quantity: Number(match[1]),
    unit: match[2].trim() || "개",
  };
}

export function displayQuantity(
  unitType: "QUANTITY" | "PERCENT" | "CUSTOM",
  quantity: number | null,
  unit: string | null,
  customQuantityText: string | null,
) {
  if (unitType === "CUSTOM") return customQuantityText || "수량 미정";
  if (quantity === null) return unit || "수량 미정";
  return `${quantity}${unit ?? ""}`;
}

