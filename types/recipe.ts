export type RecipeDifficulty = "쉬움" | "보통" | "도전";

export type RecipeHealthOption = "가벼운 한 끼" | "고단백" | "저염";

export type RecipeIngredient = { ingredientId: number; amount: string };

export type RecipeStep = { id: number; description: string; tip?: string };

export type RecipeSummary = {
  id: number;
  title: string;
  description: string;
  cookingTime: number;
  difficulty: RecipeDifficulty;
  servings: number;
  healthOptions: RecipeHealthOption[];
  ingredients: RecipeIngredient[];
};

export type RecipeDetail = RecipeSummary & { steps: RecipeStep[] };

export type RecipeCriteria = {
  preferredIngredientIds: number[];
  excludedIngredientIds: number[];
  healthOptions: RecipeHealthOption[];
  additionalRequest: string;
};

export type RecipeSource = {
  getDailyRecipes: () => Promise<RecipeSummary[]>;
  recommendRecipes: (criteria: RecipeCriteria) => Promise<RecipeSummary[]>;
  getRecipe: (id: number) => Promise<RecipeDetail | null>;
};
