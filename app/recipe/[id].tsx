import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addCartItem, getActiveCarts, getOrCreateActiveCart } from "../../api/cartApi";
import { getInventories } from "../../api/inventoryApi";
import { recordRecipeFeedback } from "../../api/recipeApi";
import { CookingCompleteModal } from "../../components/recipe/CookingCompleteModal";
import { GeneratedRecipeResult } from "../../components/recipe/GeneratedRecipeResult";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import { useRecipeSession } from "../../contexts/RecipeContext";
import { recipeStyles as styles } from "../../styles/recipeStyles";
import { getApiErrorMessage } from "../../utils/apiError";
import type { InventoryItem } from "../../types/fridge";
import { findRecipeIngredient, getRecipeCartIngredients, normalizeIngredientName, resolveRecipeInventory } from "../../utils/recipeIngredients";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentFridge } = useFridge();
  const { entries, loading, error, reload, setFavorite } = useRecipeSession();
  const entry = entries.find(e => e.id === id);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [cookVisible, setCookVisible] = useState(false);
  const [cookCompleted, setCookCompleted] = useState(false);
  const [recipeInventories, setRecipeInventories] = useState<InventoryItem[]>([]);
  const [recipeInventoryLoading, setRecipeInventoryLoading] = useState(true);
  const [recipeInventoryError, setRecipeInventoryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOptionalIngredientNames, setSelectedOptionalIngredientNames] = useState<Set<string>>(new Set());
  const inventoryResolution = useMemo(
    () => entry ? resolveRecipeInventory(entry.recipe, recipeInventories) : { ingredients: [], ownedIngredients: [], missingIngredients: [], optionalIngredients: [] },
    [entry, recipeInventories],
  );
  const toggleOptionalIngredient = (ingredientName: string) => {
    const key = normalizeIngredientName(ingredientName);
    setSelectedOptionalIngredientNames((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const selectable = new Set(inventoryResolution.optionalIngredients.filter((ingredient) => !ingredient.owned).map((ingredient) => normalizeIngredientName(ingredient.nameText)));
    setSelectedOptionalIngredientNames((current) => new Set([...current].filter((name) => selectable.has(name))));
  }, [inventoryResolution]);

  const loadRecipeInventories = useCallback(async (showSpinner = true) => {
    if (!currentFridge) {
      setRecipeInventories([]);
      setRecipeInventoryError("현재 냉장고를 선택한 뒤 부족 재료를 확인해 주세요.");
      setRecipeInventoryLoading(false);
      return [];
    }
    if (showSpinner) setRecipeInventoryLoading(true);
    setRecipeInventoryError(null);
    try {
      const inventories = await getInventories(currentFridge.fridgeId);
      setRecipeInventories(inventories);
      return inventories;
    } catch (inventoryError) {
      setRecipeInventories([]);
      setRecipeInventoryError(getApiErrorMessage(inventoryError, "현재 냉장고 재고를 불러오지 못했어요. 다시 시도해 주세요."));
      return [];
    } finally {
      if (showSpinner) setRecipeInventoryLoading(false);
    }
  }, [currentFridge]);

  useFocusEffect(useCallback(() => {
    void loadRecipeInventories();
  }, [loadRecipeInventories]));

  const refreshDetail = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await loadRecipeInventories(false); }
    finally { setRefreshing(false); }
  };
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/Recipe');
  const favorite = async (value: boolean) => {
    if (!entry || saving) return;
    setSaving(true); setMessage(null);
    try { await setFavorite(entry.id, value, currentFridge?.fridgeId); setMessage(value ? '이 기기의 즐겨찾기에 저장했어요.' : '즐겨찾기에서 해제했어요.'); }
    catch (e) { setMessage(getApiErrorMessage(e, '즐겨찾기를 저장하지 못했어요. 다시 시도해 주세요.')); }
    finally { setSaving(false); }
  };
  const addMissing = async () => {
    if (!entry || adding) return;
    if (!currentFridge) { setCartMessage('장바구니에 담을 냉장고를 먼저 선택해 주세요.'); return; }
    if (recipeInventoryLoading || recipeInventoryError) { setCartMessage('현재 냉장고 재고를 불러온 뒤 부족 재료를 담아 주세요.'); return; }
    setAdding(true); setCartMessage(null);
    try {
      const recipe = entry.recipe;
      const carts = await getActiveCarts(currentFridge.fridgeId);
      const existing = new Set(carts.flatMap(c => c.items.filter(i => i.state === 'NEEDED').map(i => normalizeIngredientName(i.itemName))));
      const cartIngredients = getRecipeCartIngredients(inventoryResolution, selectedOptionalIngredientNames);
      const alreadyInCart = cartIngredients.filter((ingredient) => existing.has(normalizeIngredientName(ingredient.nameText))).map((ingredient) => ingredient.nameText);
      const pending = cartIngredients.filter((ingredient) => !existing.has(normalizeIngredientName(ingredient.nameText)));
      if (!pending.length) { setSelectedOptionalIngredientNames(new Set()); setCartMessage(`선택한 재료 ${cartIngredients.length}개가 모두 장바구니에 있어요.`); return; }
      const cart = await getOrCreateActiveCart(currentFridge.fridgeId, '레시피 장보기');
      const added: string[] = [];
      const currentlyOwned: string[] = [];
      const failed: string[] = [];
      for (const missing of pending) {
        const name = missing.nameText;
        const ingredient = findRecipeIngredient(recipe, name);
        try {
          await addCartItem(cart.cartId, { itemName: name, unitType: 'QUANTITY', quantity: ingredient?.quantity && ingredient.quantity > 0 ? ingredient.quantity : 1, unit: ingredient?.unit?.trim() || '개', memo: `${recipe.recipeName} 레시피 추천`, sourceType: 'RECIPE', sourceRefId: recipe.recipeId ?? undefined });
          added.push(name);
        } catch (addError) {
          const detail = getApiErrorMessage(addError, '추가 실패');
          if (detail.includes('이미 장바구니')) alreadyInCart.push(name);
          else if (detail.includes('이미 냉장고')) currentlyOwned.push(name);
          else failed.push(name);
        }
      }
      if (currentlyOwned.length) await loadRecipeInventories(false);
      const refreshedCarts = await getActiveCarts(currentFridge.fridgeId);
      const refreshedNames = new Set(refreshedCarts.flatMap((currentCart) => currentCart.items.filter((item) => item.state === 'NEEDED').map((item) => normalizeIngredientName(item.itemName))));
      const confirmedAdded = added.filter((name) => refreshedNames.has(normalizeIngredientName(name)));
      failed.push(...added.filter((name) => !refreshedNames.has(normalizeIngredientName(name))));
      const failedKeys = new Set(failed.map(normalizeIngredientName));
      setSelectedOptionalIngredientNames((current) => new Set([...current].filter((name) => failedKeys.has(name))));
      const results = [
        confirmedAdded.length ? `추가 완료: ${confirmedAdded.join(', ')}` : null,
        alreadyInCart.length ? `이미 담김: ${alreadyInCart.join(', ')}` : null,
        currentlyOwned.length ? `현재 보유: ${currentlyOwned.join(', ')}` : null,
        failed.length ? `추가 실패: ${failed.join(', ')}` : null,
      ].filter(Boolean);
      setCartMessage(results.length ? `${results.join(' · ')}${failed.length ? '. 실패한 재료만 다시 시도해 주세요.' : ''}` : '추가할 부족 재료가 없어요.');
    } catch (e) { setCartMessage(getApiErrorMessage(e, '장바구니에 담지 못했어요. 다시 시도해 주세요.')); }
    finally { setAdding(false); }
  };
  const feedback = async (eventType: 'DISMISSED') => {
    if (!entry || feedbackLoading) return;
    if (!currentFridge) { setMessage('냉장고를 먼저 선택해 주세요.'); return; }
    setFeedbackLoading(true); setMessage(null);
    try {
      await recordRecipeFeedback({ fridgeId: currentFridge.fridgeId, recipeKey: entry.recipe.recipeKey, recipeName: entry.recipe.recipeName, eventType });
      setMessage('의견을 보냈어요. 목록에서 조건을 바꿔 다시 추천받을 수 있어요.'); back();
    } catch (e) { setMessage(getApiErrorMessage(e, '의견을 보내지 못했어요.')); }
    finally { setFeedbackLoading(false); }
  };

  const openCookReview = () => {
    if (!entry || !currentFridge) { setMessage("냉장고를 먼저 선택해 주세요."); return; }
    if (!entry.recipe.recipeKey) { setMessage("조리 기록에 필요한 레시피 식별자가 없습니다. 새로 추천받아 주세요."); return; }
    if (cookCompleted) { setMessage("이미 조리 완료한 기록입니다. 캘린더에서 확인해 주세요."); return; }
    setCookVisible(true);
  };
  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.screenContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshDetail()} tintColor={Colors.mainStrong} />}>
    <View style={styles.header}><Pressable style={styles.headerBackButton} onPress={back} accessibilityLabel="레시피 목록으로"><MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} /></Pressable><Text style={styles.title}>레시피 상세</Text></View>
    {loading ? <ActivityIndicator color={Colors.mainStrong} /> : error ? <View style={styles.errorState}><Text style={styles.errorTitle}>{error}</Text><Pressable style={styles.retryButton} onPress={() => void reload()}><Text style={styles.retryButtonText}>다시 불러오기</Text></Pressable></View> : !entry ? <View style={styles.emptyState}><Text style={styles.emptyTitle}>레시피를 찾지 못했어요</Text><Text style={styles.emptyDescription}>저장하지 않은 추천은 앱을 종료하면 사라져요. 레시피 목록에서 다시 추천받아 주세요.</Text><Pressable style={styles.retryButton} onPress={() => router.replace('/(tabs)/Recipe')}><Text style={styles.retryButtonText}>레시피 목록</Text></Pressable></View> : <>
      {entry.persisted ? <Text style={styles.criteriaHint}>보유·부족 재료는 추천 당시 기준이에요. 현재 냉장고와 다를 수 있어요.</Text> : null}
      <GeneratedRecipeResult recipe={entry.recipe} saving={saving} saved={entry.favorite} addingToCart={adding} feedbackLoading={feedbackLoading} cartMessage={cartMessage} feedbackMessage={message} inventoryResolution={inventoryResolution} inventoryLoading={recipeInventoryLoading} inventoryError={recipeInventoryError} selectedOptionalIngredientNames={selectedOptionalIngredientNames} onRetryInventory={() => void loadRecipeInventories()} onToggleOptionalIngredient={toggleOptionalIngredient} onSave={() => void favorite(true)} onAddMissingIngredients={() => void addMissing()} onCooked={() => void openCookReview()} onDismiss={() => void feedback('DISMISSED')} />
      {cartMessage ? <Pressable style={styles.secondaryAction} onPress={() => router.push('/(tabs)/Cart')}><MaterialCommunityIcons name="cart-outline" size={20} color={Colors.mainStrong} /><Text style={styles.secondaryActionText}>장바구니에서 확인</Text></Pressable> : null}
      {entry.favorite ? <Pressable style={styles.secondaryAction} disabled={saving} onPress={() => void favorite(false)}><MaterialCommunityIcons name="bookmark-remove-outline" size={20} color={Colors.mainStrong} /><Text style={styles.secondaryActionText}>즐겨찾기 해제</Text></Pressable> : null}
      {cookCompleted ? <Pressable style={styles.secondaryAction} onPress={() => router.push("/(tabs)/Calendar")} accessibilityRole="button"><MaterialCommunityIcons name="calendar-check-outline" size={20} color={Colors.mainStrong} /><Text style={styles.secondaryActionText}>캘린더에서 식사 기록 보기</Text></Pressable> : null}
    </>}
    {entry && currentFridge && <CookingCompleteModal
      key={`${entry.id}-${currentFridge.fridgeId}`}
      visible={cookVisible} recipe={entry.recipe} fridgeId={currentFridge.fridgeId}
      onClose={() => setCookVisible(false)}
      onDone={() => {
        setCookVisible(false);
        setCookCompleted(true);
        setMessage("선택한 재고 차감, 캘린더 식사 기록과 추천 피드백을 함께 저장했어요.");
        void loadRecipeInventories(false);
      }}
    />}
  </ScrollView></SafeAreaView>;
}
