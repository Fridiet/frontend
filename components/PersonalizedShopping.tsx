import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { getShoppingRecommendation, type RecipeResponse } from "../api/recipeApi";
import { Colors } from "../constants/colors";
import { getApiErrorMessage } from "../utils/apiError";

export default function PersonalizedShopping({ fridgeId, onSelect }: {
  fridgeId: number;
  onSelect: (name: string, quantity: string, recipeTitle: string) => void;
}) {
  const [recipe, setRecipe] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setRecipe(null);
    try { setRecipe(await getShoppingRecommendation(fridgeId)); }
    catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 404 ? "현재 재고로 제안할 추가 구매 재료가 없어요." : getApiErrorMessage(e, "추천을 불러오지 못했습니다."));
    } finally { setLoading(false); }
  };
  return (
    <View style={{ backgroundColor: "white", borderRadius: 16, padding: 18, marginBottom: 16, gap: 10 }}>
      <Text style={{ color: Colors.mainDark, fontWeight: "700", fontSize: 18 }}>맞춤 장보기 제안</Text>
      <Text style={{ color: Colors.subText }}>현재 재고·건강 목표·최근 저장 및 조리 기록을 활용해, 부족 재료가 1~3개인 요리를 제안합니다.</Text>
      <Pressable onPress={() => void load()} disabled={loading} accessibilityRole="button"
        style={{ padding: 12, borderRadius: 10, backgroundColor: Colors.main }}>
        <Text style={{ color: "white", textAlign: "center" }}>{loading ? "추천 중…" : "현재 조건으로 추천 받기"}</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={Colors.main} /> : null}
      {error ? <Text style={{ color: Colors.subText }}>{error}</Text> : null}
      {recipe ? <>
        <Text style={{ fontWeight: "700", fontSize: 17 }}>{recipe.recipeName}</Text>
        <Text style={{ color: Colors.subText }}>{(recipe.scoreBreakdown?.personalization_weight ?? 0) > 0
          ? "최근 저장·조리 기록을 추천 순위에 반영했어요."
          : "활용할 취향 기록이 없어 재고와 설정된 건강 목표를 기준으로 추천했어요."}</Text>
        <Text>보유 재료: {recipe.availableIngredients.join(", ") || "없음"}</Text>
        <Text style={{ color: Colors.subText }}>환산 가능한 단위는 필요량에서 보유량을 뺐어요. 포장 구매량과 단위 미상은 직접 확인하세요.</Text>
        {Array.from(new Set([...recipe.missingIngredients,
          ...(recipe.ingredientBalances ?? []).filter((b) => b.status === "SHORTAGE").map((b) => b.name)
        ])).map((name) => {
          const balance = recipe.ingredientBalances?.find((b) => b.name === name && b.status === "SHORTAGE");
          const ingredient = recipe.ingredients.find((item) => item.nameText === name);
          const amount = balance?.shortageQuantity != null ? `${balance.shortageQuantity}${balance.unit}`
            : ingredient && ingredient.quantity > 0 ? `${ingredient.quantity}${ingredient.unit}` : "수량 확인 필요";
          return <Pressable key={name} accessibilityRole="button"
            onPress={() => onSelect(name, amount, recipe.recipeName)}
            style={{ borderWidth: 1, borderColor: Colors.main, borderRadius: 8, padding: 12 }}>
            <Text style={{ color: Colors.mainDark }}>{name} · {amount} — 수량 확인 후 추가</Text>
          </Pressable>;
        })}
        {(recipe.ingredientBalances ?? []).filter((b) => b.status === "UNKNOWN").map((b, i) =>
          <Text key={`unknown-${i}`} style={{ color: Colors.subText }}>{b.name}: 보유량 또는 단위를 비교할 수 없어 부족 수량을 확정하지 않았어요.</Text>)}
      </> : null}
    </View>
  );
}
