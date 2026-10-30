import apiClient from "./client";
import type { MealRecordPayload, MealRecordResponse } from "./calendarApi";
import type { InventoryItem } from "../types/fridge";

export async function previewRecipeConsumption(fridgeId: number, ingredients: RecipeIngredientResponse[]) {
  return (await apiClient.post<{ items: { stock: InventoryItem; quantityUsed: number; remainingAfter: number | null; reason: string }[]; warnings: string[] }>(
    "/api/recipes/ai/consumption-preview", { fridgeId, ingredients })).data;
}

export async function completeRecipeCooking(recipeKey: string, meal: MealRecordPayload) {
  const response = await apiClient.post<MealRecordResponse>("/api/recipes/ai/complete", { recipeKey, meal });
  return response.data;
}

export type RecipeGeneratePayload = {
  fridgeId: number;
  targetUserId?: number;
  healthCondition?: string | null;
  healthGoal?: string | null;
  targetIngredients: string[];
  additionalIngredients: string[];
  excludeIngredients: string[];
};

export type RecipeIngredientResponse = {
  id: number | null;
  ingredientMasterId: number | null;
  nameText: string;
  category?: string | null;
  iconName?: string | null;
  quantity: number;
  unit: string;
  optional: boolean;
};

export type RecipeResponse = {
  ingredientBalances?: Array<{
    name: string;
    requiredQuantity: number | null;
    knownAvailableQuantity: number;
    shortageQuantity: number | null;
    unit: string;
    status: "ENOUGH" | "SHORTAGE" | "UNKNOWN";
  }>;
  recipeKey?: string | null;
  recipeId: number | null;
  ownerUserId: number;
  recipeName: string;
  cookTime: number;
  isGenerated: boolean;
  description: string | null;
  memo: string | null;
  stepsJson: string;
  ingredients: RecipeIngredientResponse[];
  createdAt: string | null;
  recommendationScore: number | null;
  scoreBreakdown: Record<string, number | null> | null;
  recommendationReasons: string[];
  availableIngredients: string[];
  missingIngredients: string[];
};

export async function generateAiRecipe(payload: RecipeGeneratePayload) {
  const response = await apiClient.post<RecipeResponse>(
    "/api/recipes/ai/preview",
    payload,
  );
  return response.data;
}

function recipeSignature(recipe: RecipeResponse) {
  return JSON.stringify([
    recipe.recipeName.trim().toLocaleLowerCase("ko-KR"),
    recipe.cookTime,
    recipe.ingredients.map((ingredient) => [
      ingredient.nameText.trim().toLocaleLowerCase("ko-KR"),
      ingredient.quantity,
      ingredient.unit,
      ingredient.optional,
    ]),
  ]);
}

export async function generateAiRecipes(
  payload: RecipeGeneratePayload,
  options: {
    limit?: number;
    maxAttempts?: number;
    variants?: RecipeGeneratePayload[];
    avoidRecipeNames?: string[];
  } = {},
) {
  const limit = options.limit ?? 3;
  const maxAttempts = options.maxAttempts ?? 5;
  const recipes: RecipeResponse[] = [];
  const signatures = new Set<string>();
  const avoidedNames = new Set((options.avoidRecipeNames ?? []).map((name) => name.trim().toLocaleLowerCase("ko-KR")));
  const avoidedFallbacks: RecipeResponse[] = [];
  const attemptPayloads = [...(options.variants ?? []), payload];
  let firstError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts && recipes.length < limit; attempt += 1) {
    try {
      const recipe = await generateAiRecipe(attemptPayloads[attempt % attemptPayloads.length]);
      const signature = recipeSignature(recipe);
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      if (avoidedNames.has(recipe.recipeName.trim().toLocaleLowerCase("ko-KR"))) {
        avoidedFallbacks.push(recipe);
      } else {
        recipes.push(recipe);
      }
    } catch (error) {
      firstError ??= error;
    }
  }

  if (recipes.length === 0 && avoidedFallbacks.length > 0) {
    if (avoidedNames.size > 0) throw new Error("현재 재고에서 이전과 다른 추천을 찾지 못했어요.");
    return avoidedFallbacks.slice(0, limit);
  }
  if (recipes.length === 0 && firstError) throw firstError;
  return recipes;
}

export async function getShoppingRecommendation(fridgeId: number) {
  const response = await apiClient.post<RecipeResponse>("/api/recipes/ai/shopping", {
    fridgeId, targetIngredients: [], additionalIngredients: [], excludeIngredients: [],
  });
  return response.data;
}

export type RecipeSavePayload = {
  recipeKey?: string | null;
  fridgeId?: number;
  recipeName: string;
  cookTime: number;
  description: string | null;
  memo: string | null;
  stepsJson: string;
  ingredients: Array<{
    nameText: string;
    quantity: number;
    unit: string;
    optional: boolean;
  }>;
};

export async function saveAiRecipe(payload: RecipeSavePayload) {
  const response = await apiClient.post<RecipeResponse>(
    "/api/recipes/ai/save",
    payload,
  );
  return response.data;
}

export async function recordRecipeFeedback(payload: {
  recipeKey?: string | null;
  fridgeId: number;
  recipeName: string;
  eventType: "COOKED" | "DISMISSED";
}) {
  await apiClient.post("/api/recipes/ai/feedback", payload);
}

export async function getSavedRecipes(fridgeId: number) {
  const response = await apiClient.get<RecipeResponse[]>("/api/recipes/ai/saved", {
    params: { fridgeId },
  });
  return response.data;
}

export async function getRecipeDetail(fridgeId: number, recipeId: number) {
  const response = await apiClient.get(`/api/recipes/${recipeId}`, {
    params: { fridgeId },
  });
  return response.data;
}
