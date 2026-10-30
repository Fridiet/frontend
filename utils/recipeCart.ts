import { addCartItem, getOrCreateActiveCart } from "../api/cartApi";
import { parseQuantityText } from "./quantity";
import { normalizeKoreanText } from "./text";

export type RecipeCartIngredient = {
  name: string;
  amount: string;
};

export type RecipeCartResult = {
  added: number;
  skipped: number;
  failed: number;
};

export async function addRecipeIngredientsToCart(
  fridgeId: number,
  recipeId: number,
  ingredients: RecipeCartIngredient[],
): Promise<RecipeCartResult> {
  const cart = await getOrCreateActiveCart(fridgeId);
  const existingNames = new Set(
    cart.items
      .filter((item) => item.state === "NEEDED")
      .map((item) => normalizeKoreanText(item.itemName)),
  );
  const seenNames = new Set(existingNames);
  const additions = ingredients.filter((ingredient) => {
    const name = normalizeKoreanText(ingredient.name);
    if (!name || seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
  const skipped = ingredients.length - additions.length;

  const results = await Promise.allSettled(
    additions.map((ingredient) =>
      addCartItem(cart.cartId, {
        itemName: ingredient.name,
        ...parseQuantityText(ingredient.amount),
        sourceType: "RECIPE",
        sourceRefId: recipeId,
      }),
    ),
  );

  const added = results.filter((result) => result.status === "fulfilled").length;
  return { added, skipped, failed: additions.length - added };
}

