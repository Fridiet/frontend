import { IngredientIcon } from "../../components/IngredientIcon";
import { useSession } from "../../hooks/useSession";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { getActiveCarts, type CartItemResponse } from "../../api/cartApi";
import { getInventories } from "../../api/inventoryApi";
import { generateAiRecipe } from "../../api/recipeApi";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import { useRecipeSession } from "../../contexts/RecipeContext";
import { useNotifications } from "../../contexts/NotificationContext";

import { homeStyles as styles } from "../../styles/appStyles";
import type { InventoryItem } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";
import { getUrgentIngredient, homeRecommendationFingerprint } from "../../utils/inventoryRecommendation";
import { isUsableInventory } from "../../utils/inventoryAvailability";
import { resolveRecipeInventory } from "../../utils/recipeIngredients";


/* =============================
   보관 위치 한글 표시
============================= */

const storageLabelMap: Record<string, string> = {
  REFRIGERATED: "냉장",
  FROZEN: "냉동",
  ROOM_TEMP: "상온",
  ROOM_TEMPERATURE: "상온",
  SEASONING: "조미료",
};

function quantityText(item: InventoryItem) {
  if (item.unitType === "CUSTOM") {
    return item.customQuantityText
      ? `${item.customQuantityText} 남음`
      : "수량 미입력";
  }

  if (item.remainingQuantity === null) return "수량 미입력";
  return `${item.remainingQuantity}${item.unit ?? ""} 남음`;
}

/* =============================
   HOME
============================= */

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const recipes = useRecipeSession();
  const { unreadCount } = useNotifications();
  const { currentFridge } = useFridge();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItemResponse[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryFridgeId, setInventoryFridgeId] = useState<number | null>(null);
  const [recipeIdsByCondition, setRecipeIdsByCondition] = useState<Record<string, string>>({});
  const [homeRecipeLoading, setHomeRecipeLoading] = useState(false);
  const [homeRecipeError, setHomeRecipeError] = useState<string | null>(null);
  const [targetRecipeLoadingIds, setTargetRecipeLoadingIds] = useState<ReadonlySet<number>>(new Set());
  const [targetRecipeErrors, setTargetRecipeErrors] = useState<Record<number, string>>({});
  const recipeRequestKey = useRef("");
  const recipeBusy = useRef(false);
  const inventoryGeneration = useRef(0);

  const loadHomeInventory = useCallback(async () => {
    const version = ++inventoryGeneration.current;
    if (!currentFridge) {
      setInventoryItems([]);
      setInventoryError(null);
      setInventoryLoading(false);
      setInventoryReady(true);
      setInventoryFridgeId(null);
      return;
    }

    setInventoryReady(false);
    setInventoryFridgeId(null);
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const items = await getInventories(currentFridge.fridgeId);
      if (version === inventoryGeneration.current) setInventoryItems(items);
    } catch (error) {
      if (version === inventoryGeneration.current) {
        setInventoryItems([]);
        setInventoryError(getApiErrorMessage(error, "냉장고 재료를 불러오지 못했습니다."));
      }
    } finally {
      if (version === inventoryGeneration.current) {
        setInventoryLoading(false);
        setInventoryReady(true);
        setInventoryFridgeId(currentFridge.fridgeId);
      }
    }
  }, [currentFridge]);

  const loadHomeCart = useCallback(async () => {
    if (!currentFridge) {
      setCartItems([]);
      setCartError(null);
      return;
    }
    setCartLoading(true);
    setCartError(null);
    try {
      const carts = await getActiveCarts(currentFridge.fridgeId);
      setCartItems(carts.flatMap((cart) => cart.items).filter((item) => item.state === "NEEDED"));
    } catch (error) {
      setCartItems([]);
      setCartError(getApiErrorMessage(error, "장바구니를 불러오지 못했습니다."));
    } finally {
      setCartLoading(false);
    }
  }, [currentFridge]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeInventory();
      void loadHomeCart();
    }, [loadHomeCart, loadHomeInventory]),
  );

  /* =============================
     임박 재료

     냉장고 데이터
     +
     식재료 데이터 연결

     소비기한 3일 이내만 표시
  ============================= */

  const expiringIngredients = useMemo(() => {
    return inventoryItems
      .filter(
        (item) => isUsableInventory(item) && item.dDay !== null && item.dDay >= 0 && item.dDay <= 3,
      )
      .sort((a, b) => (a.dDay ?? 0) - (b.dDay ?? 0));
  }, [inventoryItems]);

  const urgentIngredient = useMemo(() => getUrgentIngredient(inventoryItems), [inventoryItems]);
  const urgentFingerprint = useMemo(() => homeRecommendationFingerprint(currentFridge?.fridgeId, urgentIngredient?.batchId, inventoryItems), [currentFridge?.fridgeId, inventoryItems, urgentIngredient?.batchId]);

  const homeRecipeId = urgentFingerprint ? recipeIdsByCondition[urgentFingerprint] ?? null : null;

  const loadHomeRecipe = useCallback(async (force = false, openAfterLoad = false) => {
    if (!currentFridge || inventoryFridgeId !== currentFridge.fridgeId || !urgentFingerprint || !inventoryReady || inventoryLoading || inventoryError || recipes.loading || recipes.error || recipeBusy.current) return;
    const cachedId = recipeIdsByCondition[urgentFingerprint];
    const cachedEntryExists = !!cachedId && recipes.entries.some((entry) => entry.id === cachedId);
    if (!force && cachedId && cachedEntryExists) {
      if (openAfterLoad) router.push({ pathname: "/recipe/[id]", params: { id: cachedId } });
      return;
    }
    if (!force && recipeRequestKey.current === urgentFingerprint && cachedEntryExists) return;
    recipeBusy.current = true;
    recipeRequestKey.current = urgentFingerprint;
    setHomeRecipeLoading(true);
    setHomeRecipeError(null);
    try {
      const recipe = await generateAiRecipe({
        fridgeId: currentFridge.fridgeId,
        targetIngredients: urgentIngredient ? [urgentIngredient.ingredientName] : [],
        additionalIngredients: [],
        excludeIngredients: [],
        healthCondition: session?.healthCondition || null,
        healthGoal: session?.healthGoal || null,
      });
      if (!recipe) {
        setHomeRecipeError("추천할 레시피를 찾지 못했어요.");
      } else {
        const id = recipes.remember(recipe);
        setRecipeIdsByCondition((current) => ({ ...current, [urgentFingerprint]: id }));
        if (openAfterLoad) router.push({ pathname: "/recipe/[id]", params: { id } });
      }
    } catch (error) {
      recipeRequestKey.current = "";
      setHomeRecipeError(getApiErrorMessage(error, "임박 재료 레시피를 불러오지 못했어요."));
    } finally {
      recipeBusy.current = false;
      setHomeRecipeLoading(false);
    }
  }, [currentFridge, inventoryError, inventoryFridgeId, inventoryLoading, inventoryReady, recipeIdsByCondition, recipes, router, session?.healthCondition, session?.healthGoal, urgentFingerprint, urgentIngredient]);

  useEffect(() => {
    if (urgentFingerprint) void loadHomeRecipe();
    else {
      setHomeRecipeError(null);
      recipeRequestKey.current = "";
    }
  }, [loadHomeRecipe, urgentFingerprint]);

  const homeRecipe = recipes.entries.find((entry) => entry.id === homeRecipeId)?.recipe ?? null;

  const openIngredientRecipe = async (item: InventoryItem) => {
    if (!currentFridge || targetRecipeLoadingIds.has(item.batchId) || !urgentFingerprint) return;
    if (item.batchId === urgentIngredient?.batchId && homeRecipeId) {
      router.push({ pathname: "/recipe/[id]", params: { id: homeRecipeId } });
      return;
    }
    const conditionKey = `${urgentFingerprint}|target:${item.batchId}`;
    const cachedId = recipeIdsByCondition[conditionKey];
    if (cachedId && recipes.entries.some((entry) => entry.id === cachedId)) {
      router.push({ pathname: "/recipe/[id]", params: { id: cachedId } });
      return;
    }
    setTargetRecipeLoadingIds((current) => new Set(current).add(item.batchId));
    setTargetRecipeErrors((current) => ({ ...current, [item.batchId]: "" }));
    try {
      const recipe = await generateAiRecipe({
        fridgeId: currentFridge.fridgeId,
        targetIngredients: [item.ingredientName],
        additionalIngredients: [],
        excludeIngredients: [],
        healthCondition: session?.healthCondition || null,
        healthGoal: session?.healthGoal || null,
      });
      const id = recipes.remember(recipe);
      setRecipeIdsByCondition((current) => ({ ...current, [conditionKey]: id }));
      router.push({ pathname: "/recipe/[id]", params: { id } });
    } catch (error) {
      setTargetRecipeErrors((current) => ({ ...current, [item.batchId]: getApiErrorMessage(error, `${item.ingredientName} 추천을 만들지 못했어요. 다시 눌러 주세요.`) }));
    } finally {
      setTargetRecipeLoadingIds((current) => {
        const next = new Set(current);
        next.delete(item.batchId);
        return next;
      });
    }
  };

  /* =============================
     장바구니

     체크되지 않은 품목만 홈 표시
     홈에서는 최대 3개
  ============================= */

  const homeCartItems = useMemo(() => {
    return cartItems.slice(0, 2);
  }, [cartItems]);

  const remainingCartCount = cartItems.length;

  /* =============================
     오늘의 레시피
  ============================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================
            상단
        ========================== */}

        <View style={styles.header}>
          <View style={styles.headerTextArea}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{session?.name ? `안녕하세요, ${session.name}님` : "안녕하세요"}</Text>

              <MaterialCommunityIcons
                name="sprout"
                size={22}
                color={Colors.main}
              />
            </View>

            <Text style={styles.greetingSub}>
              오늘도 냉장고를 똑똑하게 관리해볼까요?
            </Text>
          </View>

          <View style={styles.headerButtons}>
            {/* 알림 */}
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={() => router.push("/notifications")}
              accessibilityLabel={unreadCount > 0 ? `알림 ${unreadCount}개 읽지 않음` : "알림"}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={26}
                color={Colors.text}
              />
              {unreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            {/* 설정 */}
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={() => router.push("/Mypage")}
              accessibilityLabel="설정 열기"
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={27}
                color={Colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =========================
            곧 소비해야 해요
        ========================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>곧 소비해야 해요</Text>

              <View style={styles.expirationCountBadge}>
                <Text style={styles.expirationCountText}>
                  {expiringIngredients.length}개
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/Fridge")}
            >
              <Text style={styles.moreText}>전체보기</Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.main}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.expirationCard}>
            {inventoryLoading ? (
              <View style={styles.expirationEmpty}>
                <ActivityIndicator color={Colors.main} />
                <Text style={styles.expirationEmptyText}>
                  냉장고 재료를 확인하고 있어요.
                </Text>
              </View>
            ) : inventoryError ? (
              <TouchableOpacity
                style={styles.expirationEmpty}
                activeOpacity={0.7}
                onPress={() => void loadHomeInventory()}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={30}
                  color={Colors.coral}
                />
                <Text style={styles.expirationEmptyText}>
                  불러오지 못했어요. 눌러서 다시 시도해 주세요.
                </Text>
              </TouchableOpacity>
            ) : expiringIngredients.length > 0 ? (
              <>
                {expiringIngredients.map((item, index) => (
                  <View key={item.batchId}>
                    <View style={styles.expirationRow}>
                      {/* 재료 아이콘 */}
                      <TouchableOpacity
                        style={styles.ingredientImageArea}
                        activeOpacity={0.7}
                        onPress={() => router.push("/(tabs)/Fridge")}
                      >
                        <IngredientIcon name={item.ingredientName} category={item.category} iconName={item.iconName} style={styles.ingredientImage} />
                      </TouchableOpacity>

                      {/* 재료 정보 */}
                      <TouchableOpacity
                        style={styles.ingredientInfo}
                        activeOpacity={0.7}
                        onPress={() => router.push("/(tabs)/Fridge")}
                      >
                        <View style={styles.ingredientNameRow}>
                          <Text style={styles.ingredientName}>
                            {item.ingredientName}
                          </Text>

                          <View style={styles.storageBadge}>
                            <Text style={styles.storageBadgeText}>
                              {storageLabelMap[item.locationCategory] ?? "기타"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.dday}>
                          {item.dDayText ?? "날짜 없음"}
                        </Text>

                        <Text style={styles.amount}>{quantityText(item)}</Text>
                      </TouchableOpacity>

                      {/* 레시피 추천 */}
                      <TouchableOpacity
                        style={styles.recommendButton}
                        activeOpacity={0.7}
                        onPress={() => void openIngredientRecipe(item)}
                        disabled={targetRecipeLoadingIds.has(item.batchId)}
                        accessibilityLabel={`${item.ingredientName} 레시피를 만들고 상세 보기`}
                      >
                        {targetRecipeLoadingIds.has(item.batchId) ? <ActivityIndicator size="small" color={Colors.coral} /> : <MaterialCommunityIcons name="chef-hat" size={19} color={Colors.coral} />}

                        <Text style={styles.recommendText}>{targetRecipeLoadingIds.has(item.batchId) ? "추천 중" : "레시피 추천"}</Text>
                      </TouchableOpacity>
                    </View>

                    {targetRecipeErrors[item.batchId] ? <Text style={styles.inlineError} accessibilityRole="alert">{targetRecipeErrors[item.batchId]}</Text> : null}

                    {index < expiringIngredients.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.expirationGuide}
                  activeOpacity={0.7}
                  onPress={() => router.push("/(tabs)/Recipe")}
                >
                  <View style={styles.guideLeft}>
                    <MaterialCommunityIcons
                      name="lightbulb-outline"
                      size={21}
                      color={Colors.orange}
                    />

                    <Text style={styles.guideText}>
                      더 다양한 맞춤 레시피를 확인해 보세요
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={Colors.main}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.expirationEmpty}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={30}
                  color={Colors.main}
                />

                <Text style={styles.expirationEmptyText}>
                  곧 소비해야 할 재료가 없어요.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* =========================
            오늘의 맞춤 레시피
        ========================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘의 맞춤 레시피</Text>

            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/Recipe")}
            >
              <Text style={styles.moreText}>추천 더보기</Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.main}
              />
            </TouchableOpacity>
          </View>

          {inventoryLoading || homeRecipeLoading || recipes.loading ? (
            <View style={styles.recipeEmpty}>
              <ActivityIndicator color={Colors.mainStrong} />
              <Text style={styles.recipeEmptyText}>{urgentIngredient?.ingredientName ?? "냉장고 재료"} 활용 메뉴를 만들고 있어요.</Text>
            </View>
          ) : !inventoryItems.some(isUsableInventory) ? (
            <TouchableOpacity style={styles.recipeEmpty} onPress={() => router.push('/(tabs)/Fridge')} accessibilityRole="button" accessibilityLabel="냉장고에 재료 추가하기">
              <MaterialCommunityIcons name="chef-hat" size={36} color={Colors.mainStrong} />
              <Text style={styles.recipeEmptyText}>냉장고에 재료를 추가하면 바로 추천해드려요.</Text>
            </TouchableOpacity>
          ) : homeRecipeError || recipes.error || inventoryError ? (
            <TouchableOpacity style={styles.recipeEmpty} onPress={() => void (inventoryError ? loadHomeInventory() : loadHomeRecipe(true, true))} accessibilityRole="button" accessibilityLabel={inventoryError ? "냉장고 재료 다시 불러오기" : "오늘의 레시피 다시 만들고 상세 보기"}>
              <MaterialCommunityIcons name="refresh" size={34} color={Colors.coral} />
              <Text style={styles.recipeEmptyText}>{homeRecipeError ?? recipes.error ?? inventoryError}</Text>
              <Text style={styles.recipeRetryText}>눌러서 다시 시도</Text>
            </TouchableOpacity>
          ) : homeRecipe ? (
            <TouchableOpacity style={styles.recipeCard} activeOpacity={0.75} onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: homeRecipeId! } })} accessibilityRole="button" accessibilityLabel={`${homeRecipe.recipeName} 레시피 상세 보기`}>
              <View style={styles.recipeImageArea}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={46} color={Colors.orange} />
              </View>
              <View style={styles.recipeContent}>
                <Text style={styles.recipeTitle}>{homeRecipe.recipeName}</Text>
                <Text style={styles.recipeDescription} numberOfLines={2}>{homeRecipe.recommendationReasons[0] ?? homeRecipe.description ?? `${urgentIngredient?.ingredientName ?? "냉장고 재료"}을 활용해 보세요.`}</Text>
                <View style={styles.recipeMetaRow}>
                  <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={16} color={Colors.mainStrong} /><Text style={styles.metaText}>{homeRecipe.cookTime}분</Text></View>
                  <View style={[styles.metaItem, { marginLeft: 14 }]}><MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.mainStrong} /><Text style={styles.metaText}>보유 {resolveRecipeInventory(homeRecipe, inventoryItems).ownedIngredients.length} · 부족 {resolveRecipeInventory(homeRecipe, inventoryItems).missingIngredients.length}</Text></View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.recipeEmpty} onPress={() => void loadHomeRecipe(true, true)} accessibilityRole="button" accessibilityLabel="오늘의 레시피 만들고 상세 보기">
              <Text style={styles.recipeEmptyText}>추천 결과가 없어요. 다시 시도해 주세요.</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* =========================
            장바구니
        ========================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>장바구니</Text>

              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>
                  {remainingCartCount}개 남음
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreButton}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/Cart")}
            >
              <Text style={styles.moreText}>더보기</Text>

              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.main}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.cartCard}>
            {cartLoading ? (
              <View style={styles.cartEmpty}>
                <ActivityIndicator color={Colors.main} />
                <Text style={styles.cartEmptyText}>장바구니를 확인하고 있어요.</Text>
              </View>
            ) : cartError ? (
              <TouchableOpacity style={styles.cartEmpty} activeOpacity={0.7} onPress={() => void loadHomeCart()}>
                <Text style={styles.cartEmptyText}>불러오지 못했어요. 눌러서 다시 시도해 주세요.</Text>
              </TouchableOpacity>
            ) : homeCartItems.length > 0 ? (
              <>
                {homeCartItems.map((item, index) => (
                  <View key={item.itemId}>
                    <TouchableOpacity
                      style={styles.cartRow}
                      activeOpacity={0.7}
                      onPress={() => router.push("/(tabs)/Cart")}
                    >
                      <MaterialCommunityIcons
                        name="checkbox-blank-outline"
                        size={23}
                        color={Colors.main}
                      />

                      <IngredientIcon name={item.itemName} category={item.category} iconName={item.iconName} style={styles.cartImage} />

                      <Text style={styles.cartItemText}>
                        {item.itemName}
                      </Text>

                      <Text style={styles.cartQuantity}>
                        {item.unitType === "CUSTOM"
                          ? item.customQuantityText || "수량 미정"
                          : item.quantity === null
                            ? item.unit || "수량 미정"
                            : `${item.quantity}${item.unit ?? ""}`}
                      </Text>
                    </TouchableOpacity>

                    {index < homeCartItems.length - 1 && (
                      <View style={styles.cartDivider} />
                    )}
                  </View>
                ))}

                <View style={styles.cartDivider} />
              </>
            ) : (
              <View style={styles.cartEmpty}>
                <Text style={styles.cartEmptyText}>
                  장바구니가 비어 있어요.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.addCartButton}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/Cart")}
            >
              <MaterialCommunityIcons
                name="plus"
                size={23}
                color={Colors.subText}
              />

              <Text style={styles.addCartText}>장바구니에 추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
