export type FridgeSummary = {
  fridgeId: number;
  fridgeName: string;
  isMain: boolean;
};

export type UnitType = "QUANTITY" | "PERCENT" | "CUSTOM";

export type InventoryItem = {
  countBasis?: string | null;
  perCountQuantity?: number | null;
  perCountUnit?: string | null;
  quantityNeedsReview?: boolean;
  batchId: number;
  fridgeId: number;
  ingredientMasterId: number | null;
  ingredientName: string;
  category?: string | null;
  iconName?: string | null;
  containerId?: number | null;
  containerName?: string | null;
  qrLinked?: boolean;
  unitType: UnitType;
  remainingQuantity: number | null;
  customQuantityText: string | null;
  unit: string | null;
  consumeByDate: string;
  dDay: number | null;
  dDayText: string | null;
  locationCategory: string;
  status: string;
  isConsumed?: boolean;
  createdBy: number;
  createdAt: string;
};


export type StorageType = "refrigerated" | "frozen" | "room_temperature" | "seasoning";
