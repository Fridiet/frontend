import type { RecipeIngredientResponse, RecipeResponse } from "../api/recipeApi";
import type { InventoryItem } from "../types/fridge";
import { isUsableInventory } from "./inventoryAvailability";

export function normalizeIngredientName(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]/g, "");
}

const ingredientAliasGroups = [
  ["계란", "달걀"],
  ["소고기", "쇠고기"],
  ["소시지", "소세지"],
  ["요거트", "요구르트"],
  ["주스", "쥬스"],
] as const;

function ingredientAliasKey(value: string) {
  const normalized = normalizeIngredientName(value);
  const group = ingredientAliasGroups.find((aliases) => (aliases as readonly string[]).includes(normalized));
  return group?.[0] ?? normalized;
}

export function ingredientNamesMatch(left: string, right: string) {
  const leftKey = ingredientAliasKey(left);
  return !!leftKey && leftKey === ingredientAliasKey(right);
}

export function getRecipeMissingIngredientNames(recipe: RecipeResponse) {
  const available = new Set(recipe.availableIngredients.map(normalizeIngredientName));
  const names = new Map<string, string>();

  for (const name of recipe.missingIngredients) {
    const trimmed = name.trim();
    if (trimmed) names.set(normalizeIngredientName(trimmed), trimmed);
  }

  for (const ingredient of recipe.ingredients) {
    const normalized = normalizeIngredientName(ingredient.nameText);
    if (!ingredient.optional && normalized && !available.has(normalized)) {
      names.set(normalized, ingredient.nameText.trim());
    }
  }

  return [...names.values()];
}

export function findRecipeIngredient(recipe: RecipeResponse, name: string): RecipeIngredientResponse | undefined {
  const normalized = normalizeIngredientName(name);
  return recipe.ingredients.find((ingredient) => normalizeIngredientName(ingredient.nameText) === normalized);
}

export type RecipeIngredientDisplay = RecipeIngredientResponse & { inferred?: boolean };

export function getRecipeDisplayIngredients(recipe: RecipeResponse): RecipeIngredientDisplay[] {
  const ingredients: RecipeIngredientDisplay[] = recipe.ingredients.map((ingredient) => ({ ...ingredient }));
  const existing = new Set(ingredients.map((ingredient) => normalizeIngredientName(ingredient.nameText)));

  for (const name of getRecipeMissingIngredientNames(recipe)) {
    const normalized = normalizeIngredientName(name);
    if (!normalized || existing.has(normalized)) continue;
    existing.add(normalized);
    ingredients.push({
      id: null,
      ingredientMasterId: null,
      nameText: name,
      quantity: 0,
      unit: "",
      optional: false,
      inferred: true,
    });
  }

  return ingredients;
}

export type ResolvedRecipeIngredient = RecipeIngredientDisplay & {
  availability: "OWNED" | "MISSING" | "OPTIONAL" | "REVIEW";
  owned: boolean;
  needsQuantityReview: boolean;
};

export type RecipeInventoryResolution = {
  ingredients: ResolvedRecipeIngredient[];
  ownedIngredients: ResolvedRecipeIngredient[];
  missingIngredients: ResolvedRecipeIngredient[];
  optionalIngredients: ResolvedRecipeIngredient[];
};

export function resolveRecipeInventory(
  recipe: RecipeResponse,
  inventories: InventoryItem[],
): RecipeInventoryResolution {
  const displayIngredients = getRecipeDisplayIngredients(recipe);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const usable = inventories.filter((item) => isUsableInventory(item)
    && item.status !== "EXPIRED" && (!item.consumeByDate || item.consumeByDate.slice(0, 10) >= today));
  const ingredients = displayIngredients.map((ingredient): ResolvedRecipeIngredient => {
    const hasInventory = usable.some((inventory) => (
      ingredient.ingredientMasterId !== null
        && inventory.ingredientMasterId === ingredient.ingredientMasterId
    ) || ingredientNamesMatch(inventory.ingredientName, ingredient.nameText));
    // 서버 수량 분석이 이름 일치보다 우선한다. UNKNOWN은 구매 부족으로 확정하지 않는다.
    const balance = recipe.ingredientBalances?.find((row) => ingredientNamesMatch(row.name, ingredient.nameText));
    const needsQuantityReview = hasInventory && balance?.status === "UNKNOWN";
    const owned = hasInventory && !needsQuantityReview && balance?.status !== "SHORTAGE";
    return {
      ...ingredient,
      owned,
      needsQuantityReview,
      availability: ingredient.optional ? "OPTIONAL" : needsQuantityReview ? "REVIEW" : owned ? "OWNED" : "MISSING",
    };
  });

  return {
    ingredients,
    ownedIngredients: ingredients.filter((ingredient) => ingredient.owned),
    missingIngredients: ingredients.filter((ingredient) => ingredient.availability === "MISSING"),
    optionalIngredients: ingredients.filter((ingredient) => ingredient.optional),
  };
}

export function getRecipeCartIngredients(
  resolution: RecipeInventoryResolution,
  selectedOptionalIngredientNames: ReadonlySet<string>,
) {
  const selected = new Set([...selectedOptionalIngredientNames].map(normalizeIngredientName));
  return [
    ...resolution.missingIngredients,
    ...resolution.optionalIngredients.filter((ingredient) => (
      !ingredient.owned && !ingredient.needsQuantityReview && selected.has(normalizeIngredientName(ingredient.nameText))
    )),
  ];
}
