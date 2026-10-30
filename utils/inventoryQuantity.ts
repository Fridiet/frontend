import type { InventoryItem, UnitType } from "../types/fridge";

export type QuantityMode = "count" | "percent" | "custom";

export const quantityModes: { key: QuantityMode; label: string }[] = [
  { key: "count", label: "수량" },
  { key: "percent", label: "퍼센트" },
  { key: "custom", label: "직접 입력" },
];

export type QuantityDraft = {
  mode: QuantityMode;
  count: number;
  unit: string;
  percent: number;
  customText: string;
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
};

export type QuantityPayload = {
  unitType: UnitType;
  remainingQuantity: number | null;
  unit: string | null;
  customQuantityText: string | null;
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
  quantityNeedsReview?: boolean;
};

export function quantityDraftText(draft: QuantityDraft) {
  if (draft.mode === "count") return `${draft.count}${draft.unit}`;
  if (draft.mode === "percent") return `${draft.percent}%`;
  return draft.customText.trim();
}

export function validateQuantityDraft(draft: QuantityDraft) {
  if (draft.mode === "count") {
    const hasConversion = draft.perCountQuantity != null;
    return Number.isFinite(draft.count) && draft.count > 0 && draft.count < 1e12
      && ["개", "g", "mL"].includes(draft.unit)
      && (!hasConversion || (draft.unit === "개" && Number.isFinite(draft.perCountQuantity)
        && draft.perCountQuantity! > 0 && ["g", "mL"].includes(draft.perCountUnit ?? "")));
  }
  if (draft.mode === "percent") {
    return Number.isFinite(draft.percent) && draft.percent > 0 && draft.percent <= 100;
  }

  const value = draft.customText.trim();
  return value.length > 0 && value.length <= 40;
}

export function toQuantityPayload(draft: QuantityDraft): QuantityPayload {
  if (!validateQuantityDraft(draft)) {
    throw new Error("수량을 확인해 주세요.");
  }
  if (draft.mode === "count") {
    return {
      unitType: "QUANTITY",
      remainingQuantity: draft.count,
      unit: draft.unit,
      customQuantityText: null,
      quantityNeedsReview: false,
      countBasis: draft.unit === "개" ? draft.countBasis ?? null : null,
      perCountQuantity: draft.unit === "개" ? draft.perCountQuantity ?? null : null,
      perCountUnit: draft.unit === "개" ? draft.perCountUnit ?? null : null,
    };
  }
  if (draft.mode === "percent") {
    return {
      unitType: "PERCENT",
      remainingQuantity: draft.percent,
      unit: "%",
      customQuantityText: null,
    };
  }
  return {
    unitType: "CUSTOM",
    remainingQuantity: null,
    unit: null,
    customQuantityText: draft.customText.trim(),
  };
}

export function quantityDraftFromInventory(
  inventory: Pick<InventoryItem, "unitType" | "remainingQuantity" | "unit" | "customQuantityText" | "countBasis" | "perCountQuantity" | "perCountUnit">,
): QuantityDraft {
  if (inventory.unitType === "PERCENT") {
    return {
      ...initialQuantityDraft(),
      mode: "percent",
      percent: inventory.remainingQuantity ?? 100,
    };
  }
  if (inventory.unitType === "CUSTOM") {
    return {
      ...initialQuantityDraft(),
      mode: "custom",
      customText: inventory.customQuantityText ?? "",
    };
  }
  const unit = inventory.unit?.trim() || "개";
  if (!["개", "g", "mL"].includes(unit)) {
    const quantity = inventory.remainingQuantity;
    return {
      ...initialQuantityDraft(),
      mode: "custom",
      customText: quantity !== null && quantity !== undefined ? `${quantity}${unit}` : "",
    };
  }
  return {
    ...initialQuantityDraft(),
    mode: "count",
    count: inventory.remainingQuantity ?? 1,
    unit,
    countBasis: inventory.countBasis,
    perCountQuantity: inventory.perCountQuantity,
    perCountUnit: inventory.perCountUnit,
  };
}

export function initialQuantityDraft(): QuantityDraft {
  return { mode: "count", count: 1, percent: 100, customText: "", unit: "개" };
}

