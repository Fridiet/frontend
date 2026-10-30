import type { RecipeIngredientResponse } from "../api/recipeApi";
import type { InventoryItem } from "../types/fridge";
import { isUsableInventory } from "./inventoryAvailability";

export type CookingIngredientDraft = {
  key: string;
  ingredient: RecipeIngredientResponse;
  inventoryOptions: InventoryItem[];
  batchId: number | null;
  included: boolean;
  value: string;
};

function normalized(value: string | null | undefined) {
  return (value || "").trim().toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function byExpiry(a: InventoryItem, b: InventoryItem) {
  const aTime = Date.parse(`${a.consumeByDate}T00:00:00`);
  const bTime = Date.parse(`${b.consumeByDate}T00:00:00`);
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return aTime - bTime;
}

export function buildCookingDrafts(
  ingredients: RecipeIngredientResponse[],
  inventories: InventoryItem[],
): CookingIngredientDraft[] {
  return ingredients.map((ingredient, index) => {
    const inventoryOptions = inventories
      .filter((item) => isUsableInventory(item) && normalized(item.ingredientName) === normalized(ingredient.nameText))
      .sort(byExpiry);
    const matchingUnit = inventoryOptions.find((item) =>
      item.unitType !== "CUSTOM" && normalized(item.unit) === normalized(ingredient.unit),
    );
    const selected = matchingUnit ?? null;
    const suggestedQuantity = selected?.remainingQuantity === null || selected?.remainingQuantity === undefined
      ? ingredient.quantity
      : Math.min(ingredient.quantity, selected.remainingQuantity);

    return {
      key: `${ingredient.nameText}-${index}`,
      ingredient,
      inventoryOptions,
      batchId: selected?.batchId ?? null,
      included: selected !== null && !ingredient.optional,
      value: selected ? String(suggestedQuantity) : "",
    };
  });
}

export function cookingDraftIsValid(
  draft: CookingIngredientDraft,
  inventories: InventoryItem[],
) {
  if (!draft.included) return true;
  const inventory = inventories.find((item) => item.batchId === draft.batchId);
  if (!inventory || !draft.value.trim()) return false;
  if (inventory.unitType === "CUSTOM") return true;
  const value = Number(draft.value);
  return Number.isFinite(value) && value > 0 && (inventory.remainingQuantity === null || value <= inventory.remainingQuantity);
}
