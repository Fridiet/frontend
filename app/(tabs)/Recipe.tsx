import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getInventories } from "../../api/inventoryApi";
import { generateAiRecipes, type RecipeGeneratePayload } from "../../api/recipeApi";
import { IngredientIcon } from "../../components/IngredientIcon";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import { useRecipeSession } from "../../contexts/RecipeContext";
import { useSession } from "../../hooks/useSession";
import { recipeStyles as styles } from "../../styles/recipeStyles";
import type { InventoryItem } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";
import { inventoryCompositionFingerprint } from "../../utils/inventoryRecommendation";
import { isUsableInventory } from "../../utils/inventoryAvailability";
import { resolveRecipeInventory } from "../../utils/recipeIngredients";

const namesFromInput = (value: string) => [
  ...new Set(value.split(/[,，\n]/).map((name) => name.trim()).filter(Boolean)),
];

function recommendationVariants(payload: RecipeGeneratePayload, inventoryNames: string[], offset: number) {
  const used = new Set([...payload.targetIngredients, ...payload.excludeIngredients].map((name) => name.trim().toLocaleLowerCase("ko-KR")));
  const candidates = inventoryNames.filter((name) => !used.has(name.trim().toLocaleLowerCase("ko-KR")));
  if (!candidates.length) return [];
  const rotated = candidates.map((_, index) => candidates[(index + offset) % candidates.length]);
  return rotated.slice(0, 4).map((name) => ({
    ...payload,
    targetIngredients: [...payload.targetIngredients, name],
  }));
}

export default function RecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ targetIngredient?: string; recommendationRequestId?: string; tab?: string }>();
  const { currentFridge } = useFridge();
  const session = useSession();
  const recipes = useRecipeSession();
  const [tab, setTab] = useState<"recommend" | "favorites">("recommend");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [additional, setAdditional] = useState("");
  const [excluded, setExcluded] = useState("");
  const [goal, setGoal] = useState("");
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryFridgeId, setInventoryFridgeId] = useState<number | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultIds, setResultIds] = useState<string[] | null>(null);
  const [dailyRecipeIds, setDailyRecipeIds] = useState<string[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const requestKey = useRef("");
  const dailyKey = useRef("");
  const generation = useRef(0);
  const requestBusy = useRef(false);
  const dailyBusy = useRef(false);
  const dailyCycle = useRef(0);
  const conditionCycle = useRef(0);
  const fridgeId = currentFridge?.fridgeId;

  const activeIngredients = useMemo(() => {
    const unique = new Map<string, InventoryItem>();
    for (const item of inventoryItems.filter(isUsableInventory)) {
      const name = item.ingredientName.trim();
      if (name && !unique.has(name)) unique.set(name, item);
    }
    return [...unique.values()].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "ko"));
  }, [inventoryItems]);
  const activeNames = useMemo(
    () => activeIngredients.map((item) => item.ingredientName.trim()),
    [activeIngredients],
  );

  const loadInventory = useCallback(async (clearCurrent = true) => {
    const version = ++generation.current;
    if (clearCurrent) setInventoryItems([]);
    setInventoryError(null);
    setInventoryReady(false);
    setInventoryFridgeId(null);
    if (!fridgeId) { setInventoryReady(true); return []; }
    setLoadingInventory(true);
    try {
      const items = await getInventories(fridgeId);
      if (version === generation.current) setInventoryItems(items);
      return items;
    } catch (loadError) {
      if (version === generation.current) {
        setInventoryError(getApiErrorMessage(loadError, "냉장고 재료를 불러오지 못했어요."));
      }
      return [];
    } finally {
      if (version === generation.current) { setLoadingInventory(false); setInventoryReady(true); setInventoryFridgeId(fridgeId); }
    }
  }, [fridgeId]);

  useFocusEffect(useCallback(() => {
    void loadInventory();
    return () => { generation.current += 1; };
  }, [loadInventory]));

  const loadDailyRecipe = useCallback(async (force = false, inventoryOverride?: InventoryItem[]) => {
    const sourceItems = inventoryOverride ?? inventoryItems;
    const sourceFingerprint = inventoryCompositionFingerprint(fridgeId, sourceItems);
    if (!fridgeId || (!inventoryOverride && inventoryFridgeId !== fridgeId) || (!inventoryOverride && (!inventoryReady || loadingInventory || inventoryError)) || dailyBusy.current) return;
    if (!force && dailyKey.current === sourceFingerprint) return;
    dailyBusy.current = true;
    dailyKey.current = sourceFingerprint;
    setDailyLoading(true);
    setDailyError(null);
    try {
      if (force) dailyCycle.current += 1;
      const sourceNames = [...new Set(sourceItems.filter(isUsableInventory).map((item) => item.ingredientName.trim()))].sort((a, b) => a.localeCompare(b, "ko"));
      const payload: RecipeGeneratePayload = {
        fridgeId,
        targetIngredients: [],
        additionalIngredients: [],
        excludeIngredients: [],
        healthCondition: session?.healthCondition || null,
        healthGoal: session?.healthGoal || null,
      };
      const previousNames = force ? recipes.entries.filter((entry) => dailyRecipeIds.includes(entry.id)).map((entry) => entry.recipe.recipeName) : [];
      const generated = await generateAiRecipes(payload, {
        variants: recommendationVariants(payload, sourceNames, dailyCycle.current),
        avoidRecipeNames: previousNames,
      });
      setDailyRecipeIds(generated.map(recipes.remember));
    } catch (loadError) {
      dailyKey.current = "";
      if (!force) setDailyRecipeIds([]);
      const message = getApiErrorMessage(loadError, force ? "다른 오늘의 추천을 찾지 못했어요." : "오늘의 추천을 불러오지 못했어요.");
      setDailyError(force ? `${message} 기존 추천은 유지됩니다.` : message);
    } finally {
      dailyBusy.current = false;
      setDailyLoading(false);
    }
  }, [dailyRecipeIds, fridgeId, inventoryError, inventoryFridgeId, inventoryItems, inventoryReady, loadingInventory, recipes, session?.healthCondition, session?.healthGoal]);

  useEffect(() => {
    if (inventoryReady && !loadingInventory && !inventoryError && fridgeId) void loadDailyRecipe();
  }, [fridgeId, inventoryError, inventoryReady, loadDailyRecipe, loadingInventory]);

  useEffect(() => {
    setSelected([]);
    setResultIds(null);
    setError(null);
    setDailyRecipeIds([]);
    dailyKey.current = "";
  }, [fridgeId]);
  useEffect(() => { if (params.tab === "favorites") setTab("favorites"); }, [params.tab]);

  const request = async (target?: string, forceDifferent = false, inventoryOverride?: InventoryItem[]) => {
    if (!fridgeId || requestBusy.current || recipes.loading || recipes.error) return;
    const targets = target ? [target] : selected;
    const excludes = namesFromInput(excluded);
    if ([...targets, ...namesFromInput(additional)].some((name) => excludes.includes(name))) {
      setError("사용할 재료와 제외할 재료에 같은 이름이 있어요. 입력을 확인해 주세요.");
      return;
    }
    requestBusy.current = true;
    setLoading(true);
    setError(null);
    if (!forceDifferent) setResultIds(null);
    setTab("recommend");
    const version = generation.current;
    try {
      const payload: RecipeGeneratePayload = {
        fridgeId,
        targetIngredients: targets,
        additionalIngredients: namesFromInput(additional),
        excludeIngredients: excludes,
        healthCondition: session?.healthCondition || null,
        healthGoal: goal.trim() || session?.healthGoal || null,
      };
      conditionCycle.current += 1;
      const sourceNames = [...new Set((inventoryOverride ?? inventoryItems).filter(isUsableInventory).map((item) => item.ingredientName.trim()))].sort((a, b) => a.localeCompare(b, "ko"));
      const previousNames = forceDifferent && resultIds ? recipes.entries.filter((entry) => resultIds.includes(entry.id)).map((entry) => entry.recipe.recipeName) : [];
      const generated = await generateAiRecipes(payload, {
        variants: recommendationVariants(payload, sourceNames, conditionCycle.current),
        avoidRecipeNames: previousNames,
      });
      if (version === generation.current) setResultIds(generated.map(recipes.remember));
    } catch (requestError) {
      if (version === generation.current) {
        setError(getApiErrorMessage(requestError, "추천을 불러오지 못했어요. 조건을 확인하고 다시 시도해 주세요."));
      }
    } finally {
      setLoading(false);
      requestBusy.current = false;
    }
  };
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    if (!fridgeId || recipes.loading || recipes.error || loadingInventory || inventoryError || !params.targetIngredient || !params.recommendationRequestId) return;
    const key = `${fridgeId}:${params.recommendationRequestId}`;
    if (requestKey.current === key) return;
    requestKey.current = key;
    setSelected([params.targetIngredient]);
    void requestRef.current(params.targetIngredient);
  }, [fridgeId, inventoryError, loadingInventory, params.recommendationRequestId, params.targetIngredient, recipes.error, recipes.loading, tab]);

  /*const visible = tab === "favorites"
    ? recipes.entries.filter((entry) => entry.favorite)
    : recipes.entries.filter((entry) => resultIds?.includes(entry.id));*/
  
  const visible = useMemo(() => {
    if(tab === "favorites") {
      return recipes.entries.filter((entry) => entry.favorite);
    }
    return recipes.entries.filter((entry) => resultIds?.includes(entry.id));
  }, [tab, recipes.entries, resultIds]);

  const dailyRecipes = recipes.entries.filter((entry) => dailyRecipeIds.includes(entry.id));
  const matches = query.trim()
    ? activeIngredients.filter((item) => {
      const name = item.ingredientName.trim();
      return name.includes(query.trim()) && !selected.includes(name);
    }).slice(0, 8)
    : [];

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    dailyKey.current = "";
    try {
      const items = await loadInventory(false);
      await loadDailyRecipe(true, items);
      if (resultIds !== null) await request(undefined, true, items);
    } finally {
      setRefreshing(false);
    }
  };

  const removeFavorite = async (id: string) => {
    if (recipes.favoritePendingIds.has(id)) return;
    setFavoriteMessage(null);
    try {
      await recipes.setFavorite(id, false, fridgeId);
      setFavoriteMessage("즐겨찾기에서 해제했어요.");
    } catch (favoriteError) {
      setFavoriteMessage(getApiErrorMessage(favoriteError, "즐겨찾기 해제를 저장하지 못했어요."));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.mainStrong} colors={[Colors.mainStrong]} />}>
        <Text style={styles.title}>레시피</Text>
        <View style={styles.choiceRow}>
          {(["recommend", "favorites"] as const).map((value) => (
            <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} style={[styles.healthChoice, tab === value && styles.choiceSelected]} onPress={() => setTab(value)}>
              <Text style={[styles.choiceText, tab === value && styles.choiceTextSelected]}>{value === "recommend" ? "추천" : "즐겨찾기"}</Text>
            </Pressable>
          ))}
        </View>

        {recipes.loading ? <ActivityIndicator color={Colors.mainStrong} /> : recipes.error ? (
          <View style={styles.errorState}><Text style={styles.errorTitle}>{recipes.error}</Text><Pressable style={styles.retryButton} onPress={() => void recipes.reload()}><Text style={styles.retryButtonText}>다시 불러오기</Text></Pressable></View>
        ) : null}

        {tab === "recommend" ? (
          <>
            <View style={styles.defaultSection}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.sectionTitle}>오늘의 맞춤 추천</Text>
                  <Text style={styles.criteriaHint}>냉장고 재고와 소비기한을 반영했어요.</Text>
                </View>
                {!dailyLoading ? <Pressable style={styles.compactAction} onPress={() => void loadDailyRecipe(true)} accessibilityLabel="오늘의 추천 새로고침"><MaterialCommunityIcons name="refresh" size={20} color={Colors.mainStrong} /></Pressable> : null}
              </View>
              {dailyLoading ? (
                <View style={styles.inlineState}><ActivityIndicator color={Colors.mainStrong} /><Text style={styles.description}>오늘의 메뉴를 고르고 있어요.</Text></View>
              ) : dailyError ? (
                <View style={styles.errorState}><Text style={styles.errorTitle}>{dailyError}</Text><Pressable style={styles.retryButton} onPress={() => void loadDailyRecipe(true)}><Text style={styles.retryButtonText}>다시 시도</Text></Pressable></View>
              ) : dailyRecipes.length ? (
                <View style={styles.recipeList}>
                  {dailyRecipes.map((entry) => <Pressable key={entry.id} style={styles.recipeCard} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: entry.id } })} accessibilityRole="button" accessibilityLabel={`${entry.recipe.recipeName} 오늘의 추천 상세 보기`}>
                    <View style={styles.recipeVisual}><MaterialCommunityIcons name="silverware-fork-knife" size={34} color={Colors.orangeDark} /></View>
                    <View style={styles.recipeCardBody}><Text style={styles.recipeCardTitle} numberOfLines={2}>{entry.recipe.recipeName}</Text><Text style={styles.recipeCardDescription} numberOfLines={2}>{entry.recipe.recommendationReasons[0] || entry.recipe.description}</Text><Text style={styles.description}>{entry.recipe.cookTime ? `${entry.recipe.cookTime}분` : "시간 정보 없음"} · 보유 {resolveRecipeInventory(entry.recipe, inventoryItems).ownedIngredients.length} · 부족 {resolveRecipeInventory(entry.recipe, inventoryItems).missingIngredients.length}</Text></View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.main} />
                  </Pressable>)}
                  {dailyRecipes.length < 3 ? <Text style={styles.criteriaHint}>중복을 제외해 {dailyRecipes.length}개 추천을 준비했어요. 새로고침하면 다른 메뉴를 다시 찾아요.</Text> : null}
                </View>
              ) : (
                <View style={styles.emptyState}><MaterialCommunityIcons name="fridge-outline" size={38} color={Colors.line} /><Text style={styles.emptyTitle}>추천할 메뉴를 찾지 못했어요</Text><Text style={styles.emptyDescription}>냉장고에 재료를 추가하거나 아래에서 조건을 직접 입력해 보세요.</Text></View>
              )}
            </View>

            <View style={[styles.criteriaArea, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>조건으로 추천받기</Text>
              <View style={styles.criteriaSection}>
                <Text style={styles.criteriaTitle}>냉장고 식재료</Text>
                <Text style={styles.criteriaHint}>꼭 사용할 재료를 검색해 선택하세요. 선택하지 않으면 냉장고 전체 재료로 추천해요.</Text>
                {!fridgeId ? <Text style={styles.description}>냉장고를 먼저 선택해 주세요.</Text> : loadingInventory ? <ActivityIndicator color={Colors.mainStrong} /> : inventoryError ? (
                  <><Text style={styles.errorTitle}>{inventoryError}</Text><Pressable style={styles.retryButton} onPress={() => void loadInventory()}><Text style={styles.retryButtonText}>재료 다시 불러오기</Text></Pressable></>
                ) : (
                  <>
                    <TextInput style={styles.additionalRequestInput} value={query} onChangeText={setQuery} placeholder="예: 두부, 양파 검색" accessibilityLabel="냉장고 재료 검색" placeholderTextColor={Colors.subText} />
                    {matches.map((item) => {
                      const name = item.ingredientName.trim();
                      return <Pressable key={name} style={styles.secondaryAction} onPress={() => { setSelected((list) => [...list, name]); setQuery(""); }} accessibilityLabel={`${name} 선택`}><IngredientIcon name={name} category={item.category} iconName={item.iconName} style={{ width: 26, height: 26 }} /><Text style={styles.secondaryActionText}>{name}</Text><MaterialCommunityIcons name="plus" size={20} color={Colors.mainStrong} /></Pressable>;
                    })}
                    {query.trim() && matches.length === 0 ? <Text style={styles.criteriaHint}>일치하는 재료가 없거나 이미 선택했어요.</Text> : null}
                    {!activeNames.length ? <Text style={styles.criteriaHint}>등록된 냉장고 재료가 없어요.</Text> : null}
                  </>
                )}
                <View style={styles.chipWrap}>{selected.map((name) => <Pressable key={name} style={[styles.ingredientChip, styles.choiceSelected]} onPress={() => setSelected((list) => list.filter((selectedName) => selectedName !== name))} accessibilityLabel={`${name} 선택 해제`}><Text style={styles.choiceTextSelected}>{name} ×</Text></Pressable>)}</View>
                <Text style={styles.additionalRequestLabel}>추가 재료</Text><TextInput style={styles.additionalRequestInput} value={additional} onChangeText={setAdditional} placeholder="냉장고에 없는 재료를 쉼표로 구분해 주세요" accessibilityLabel="추가 재료" placeholderTextColor={Colors.subText} />
                <Text style={styles.additionalRequestLabel}>제외할 재료</Text><TextInput style={styles.additionalRequestInput} value={excluded} onChangeText={setExcluded} placeholder="예: 새우, 우유" accessibilityLabel="제외할 재료" placeholderTextColor={Colors.subText} />
                <Text style={styles.additionalRequestLabel}>식사 목표 · 요청사항</Text><TextInput style={styles.additionalRequestInput} value={goal} onChangeText={setGoal} placeholder={session?.healthGoal || "예: 고단백, 가벼운 한 끼"} accessibilityLabel="식사 목표와 요청사항" placeholderTextColor={Colors.subText} />
              </View>
              <Pressable style={[styles.primaryAction, (loading || !fridgeId || loadingInventory || !!inventoryError || recipes.loading || !!recipes.error) && styles.disabled]} disabled={loading || !fridgeId || loadingInventory || !!inventoryError || recipes.loading || !!recipes.error} onPress={() => void request()}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryActionText}>{error ? "다시 추천받기" : "레시피 추천받기"}</Text>}
              </Pressable>
              {error ? <Text style={styles.errorTitle} accessibilityRole="alert">{error}</Text> : null}
            </View>
          </>
        ) : <Text style={styles.description}>이 계정으로 이 기기에 저장한 레시피예요. 다른 기기에는 동기화되지 않아요.</Text>}

        {favoriteMessage ? <Text style={styles.favoriteMessage} accessibilityLiveRegion="polite">{favoriteMessage}</Text> : null}

        {(tab === "favorites" || resultIds !== null) && !recipes.loading && !recipes.error ? (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>{tab === "favorites" ? "즐겨찾기" : "조건 추천 결과"} {visible.length}개</Text>
            {tab === "recommend" && visible.length > 0 && visible.length < 3 ? <Text style={styles.criteriaHint}>중복을 제외해 {visible.length}개를 찾았어요. 조건을 바꾸거나 새로고침해 보세요.</Text> : null}
            {!visible.length ? <Text style={styles.description}>{tab === "favorites" ? "저장한 레시피가 없어요. 추천 상세에서 즐겨찾기에 저장해 보세요." : "조건에 맞는 레시피가 없어요. 조건을 바꿔 보세요."}</Text> : null}
            {visible.map((entry) => (
              <Pressable key={entry.id} style={styles.recipeCard} accessibilityRole="button" accessibilityLabel={`${entry.recipe.recipeName} 상세 보기`} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: entry.id } })}>
                <View style={styles.recipeVisual}><MaterialCommunityIcons name="food-variant" size={38} color={Colors.orangeDark} /></View>
                <View style={styles.recipeCardBody}><Text style={styles.recipeCardTitle}>{entry.recipe.recipeName}</Text><Text style={styles.recipeCardDescription} numberOfLines={2}>{entry.recipe.description}</Text><Text style={styles.description}>{entry.recipe.cookTime}분 · 보유 {resolveRecipeInventory(entry.recipe, inventoryItems).ownedIngredients.length} · 부족 {resolveRecipeInventory(entry.recipe, inventoryItems).missingIngredients.length}</Text></View>
                {tab === "favorites" ? <Pressable style={styles.favoriteRemove} onPress={(event) => { event.stopPropagation(); void removeFavorite(entry.id); }} disabled={recipes.favoritePendingIds.has(entry.id)} accessibilityLabel={`${entry.recipe.recipeName} 즐겨찾기 해제`}>{recipes.favoritePendingIds.has(entry.id) ? <ActivityIndicator size="small" color={Colors.mainStrong} /> : <MaterialCommunityIcons name="bookmark-remove-outline" size={22} color={Colors.mainStrong} />}</Pressable> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
