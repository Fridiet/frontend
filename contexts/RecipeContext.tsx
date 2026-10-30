import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { saveAiRecipe, type RecipeResponse } from "../api/recipeApi";

export type LocalRecipe = { id: string; recipe: RecipeResponse; favorite: boolean; persisted: boolean };
function signature(recipe: RecipeResponse) {
  return JSON.stringify([recipe.recipeName.trim(), recipe.cookTime, recipe.stepsJson, recipe.ingredients.map(i => [i.nameText.trim(), i.quantity, i.unit, i.optional])]);
}
type RecipeContextValue = {
  entries: LocalRecipe[];
  loading: boolean;
  error: string | null;
  favoritePendingIds: ReadonlySet<string>;
  reload: () => Promise<void>;
  remember: (recipe: RecipeResponse) => string;
  setFavorite: (id: string, favorite: boolean, fridgeId?: number) => Promise<void>;
};
const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({ children, userId }: PropsWithChildren<{ userId?: string }>) {
  const [entries, setEntries] = useState<LocalRecipe[]>([]);
  const current = useRef<LocalRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingFavoriteRef = useRef(new Set<string>());
  const [favoritePendingIds, setFavoritePendingIds] = useState<ReadonlySet<string>>(new Set());
  const storageKey = userId ? `fridiet:recipes:v1:${userId}` : null;
  const publish = (next: LocalRecipe[]) => { current.current = next; setEntries(next); };
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = storageKey ? await AsyncStorage.getItem(storageKey) : null;
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || !parsed.every(e => typeof e?.id === 'string' && typeof e?.favorite === 'boolean' && e?.persisted === true && typeof e?.recipe?.recipeName === 'string' && Array.isArray(e.recipe.ingredients) && Array.isArray(e.recipe.availableIngredients) && Array.isArray(e.recipe.missingIngredients) && Array.isArray(e.recipe.recommendationReasons))) {
        throw new Error('저장된 레시피 형식을 확인해 주세요.');
      }
      publish(parsed.filter((entry) => entry.favorite).map((entry) => ({ ...entry, persisted: true })));
    } catch {
      setError('이 기기의 즐겨찾기를 읽지 못했어요. 다시 시도해 주세요.');
    } finally { setLoading(false); }
  }, [storageKey]);
  useEffect(() => { void reload(); }, [reload]);

  const remember = (recipe: RecipeResponse) => {
    const existing = current.current.find(e => signature(e.recipe) === signature(recipe));
    if (existing) return existing.id;
    const id = randomUUID();
    publish([...current.current, { id, recipe, favorite: false, persisted: false }]);
    return id;
  };

  const setFavorite = async (id: string, favorite: boolean, fridgeId?: number) => {
    if (!storageKey || loading || error) throw new Error('로그인과 저장된 레시피를 확인한 후 다시 시도해 주세요.');
    if (pendingFavoriteRef.current.has(id)) throw new Error('이 레시피를 저장하고 있어요. 잠시 후 다시 시도해 주세요.');
    const entry = current.current.find(e => e.id === id);
    if (!entry) throw new Error('레시피를 찾지 못했어요.');
    if (entry.favorite === favorite) return;
    const previous = current.current;
    pendingFavoriteRef.current.add(id);
    setFavoritePendingIds(new Set(pendingFavoriteRef.current));
    try {
      if (!favorite) {
        const optimistic = current.current.map(e => e.id === id ? { ...e, favorite: false, persisted: false } : e);
        publish(optimistic);
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(optimistic.filter(e => e.favorite && e.persisted)));
        } catch (storageError) {
          publish(previous);
          throw storageError;
        }
        return;
      }

      let recipe = entry.recipe;
      if (recipe.recipeId === null) {
        const saved = await saveAiRecipe({ recipeKey: recipe.recipeKey, fridgeId, recipeName: recipe.recipeName, cookTime: recipe.cookTime, description: recipe.description, memo: recipe.memo, stepsJson: recipe.stepsJson, ingredients: recipe.ingredients });
        if (saved.recipeId === null) throw new Error('서버에서 저장된 레시피 번호를 받지 못했어요.');
        recipe = { ...recipe, recipeId: saved.recipeId };
        // Retain server ID if device storage fails, so retry does not save twice.
        publish(current.current.map(e => e.id === id ? { ...e, recipe } : e));
      }
      const next = current.current.map(e => e.id === id ? { ...e, recipe, favorite, persisted: true } : e);
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(next.filter(e => e.favorite && e.persisted)));
        publish(next);
      } catch (storageError) {
        publish(current.current.map(e => e.id === id ? { ...e, recipe, favorite: false, persisted: false } : e));
        throw storageError;
      }
    } finally {
      pendingFavoriteRef.current.delete(id);
      setFavoritePendingIds(new Set(pendingFavoriteRef.current));
    }
  };

  return <RecipeContext.Provider value={{ entries, loading, error, favoritePendingIds, reload, remember, setFavorite }}>{children}</RecipeContext.Provider>;
}

export function useRecipeSession() {
  const context = useContext(RecipeContext);
  if (!context) throw new Error('RecipeProvider가 필요합니다.');
  return context;
}
