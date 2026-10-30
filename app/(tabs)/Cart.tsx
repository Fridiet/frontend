import { IngredientIcon } from "../../components/IngredientIcon";
import { QuantitySelector } from "../../components/QuantitySelector";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  addCartItem,
  buyCartItem,
  getActiveCarts,
  getOrCreateActiveCart,
  removeCartItem,
  type AddCartItemPayload,
  type BuyCartItemPayload,
  type CartItemResponse,
} from "../../api/cartApi";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import { useSession } from "../../hooks/useSession";
import { cartStyles as styles } from "../../styles/appStyles";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDateInput, isValidDateInput } from "../../utils/dateInput";
import { loadRecentPurchases, mergeRecentPurchases, storeRecentPurchases, type RecentPurchase } from "../../utils/recentPurchases";
import { purchaseQuantityDraftFromCartItem, purchaseQuantityPayload, purchaseQuantityText } from "../../utils/cartPurchase";
import { validateQuantityDraft, type QuantityDraft } from "../../utils/inventoryQuantity";
import PersonalizedShopping from "../../components/PersonalizedShopping";

type PurchaseDraft = {
  item: CartItemResponse;
  expirationDate: string;
  locationCategory: BuyCartItemPayload["locationCategory"];
  quantity: QuantityDraft;
};

const storageOptions: { value: PurchaseDraft["locationCategory"]; label: string }[] = [
  { value: "REFRIGERATED", label: "냉장" },
  { value: "FROZEN", label: "냉동" },
  { value: "ROOM_TEMP", label: "상온" },
];

function quantityText(item: CartItemResponse) {
  if (item.unitType === "CUSTOM") {
    return item.customQuantityText || "수량 미정";
  }
  if (item.quantity === null) return item.unit || "수량 미정";
  return `${item.quantity}${item.unit ?? ""}`;
}

function parseQuantity(value: string): AddCartItemPayload {
  const normalized = value.trim();
  if (!normalized) {
    return { itemName: "", unitType: "QUANTITY", quantity: 1, unit: "개" };
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) {
    return {
      itemName: "",
      unitType: "CUSTOM",
      customQuantityText: normalized,
    };
  }
  return {
    itemName: "",
    unitType: "QUANTITY",
    quantity: Number(match[1]),
    unit: match[2].trim() || "개",
  };
}

function openShoppingLink(itemName: string, site: "coupang" | "kurly") {
  const encodedName = encodeURIComponent(itemName);

  const url = site === "coupang" ? `https://www.coupang.com/np/search?q=${encodedName}` : `https://www.kurly.com/search?sword=${encodedName}`;

  void Linking.openURL(url);
}

export default function Cart() {
  const { currentFridge, loading: fridgeLoading } = useFridge();
  const session = useSession();
  const [cartItems, setCartItems] = useState<CartItemResponse[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [reviewVisible, setReviewVisible] = useState(false);
  const [purchaseDrafts, setPurchaseDrafts] = useState<PurchaseDraft[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [sourceRecipe, setSourceRecipe] = useState<string | null>(null);
  useEffect(() => {
    setIsAdding(false);
    setNewItemName("");
    setNewItemQuantity("");
    setSourceRecipe(null);
    setMessage(null);
  }, [currentFridge?.fridgeId]);

  const checkedCount = useMemo(
    () => checkedItemIds.size,
    [checkedItemIds],
  );

  const loadCartItems = useCallback(async (showSpinner = true, resetSelection = true) => {
    if (!currentFridge) {
      setCartItems([]);
      return;
    }

    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const carts = await getActiveCarts(currentFridge.fridgeId);
      setCartItems(carts.flatMap((cart) => cart.items).filter((item) => item.state === "NEEDED"));
      if (resetSelection) setCheckedItemIds(new Set());
    } catch (loadError) {
      setError(
        getApiErrorMessage(loadError, "장바구니를 불러오지 못했습니다."),
      );
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentFridge]);

  const loadCompletedItems = useCallback(async () => {
    if (!currentFridge || !session?.userId) {
      setRecentPurchases([]);
      return;
    }
    setRecentError(null);
    try {
      setRecentPurchases(await loadRecentPurchases(session.userId, currentFridge.fridgeId));
    } catch {
      setRecentPurchases([]);
      setRecentError("최근 구매 완료 내역을 불러오지 못했어요.");
    }
  }, [currentFridge, session?.userId]);

  useFocusEffect(
    useCallback(() => {
      void loadCartItems();
      void loadCompletedItems();
    }, [loadCartItems, loadCompletedItems]),
  );

  const refreshCart = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadCartItems(false), loadCompletedItems()]);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleItem = (itemId: number) => {
    setCheckedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const deleteItem = async (itemId: number) => {
    setMutating(true);
    setError(null);
    setMessage(null);
    try {
      await removeCartItem(itemId);
      await loadCartItems();
    } catch (deleteError) {
      setError(
        getApiErrorMessage(deleteError, "장바구니 품목을 삭제하지 못했습니다."),
      );
    } finally {
      setMutating(false);
    }
  };

  const addItem = async () => {
    const itemName = newItemName.trim();
    if (!itemName || !currentFridge) return;

    setMutating(true);
    setError(null);
    setMessage(null);
    try {
      const cart = await getOrCreateActiveCart(currentFridge.fridgeId);
      await addCartItem(cart.cartId, {
        ...parseQuantity(newItemQuantity),
        itemName,
        sourceType: sourceRecipe ? "RECIPE" : "MANUAL",
        memo: sourceRecipe ? `맞춤 장보기 제안: ${sourceRecipe}` : undefined,
      });
      setNewItemName("");
      setNewItemQuantity("");
      setSourceRecipe(null);
      setIsAdding(false);
      setMessage(`${itemName}을(를) 장바구니에 추가했습니다.`);
      await loadCartItems();
    } catch (addError) {
      setError(
        getApiErrorMessage(addError, "장바구니 품목을 추가하지 못했습니다."),
      );
    } finally {
      setMutating(false);
    }
  };

  const cancelAddItem = () => {
    setSourceRecipe(null);
    setNewItemName("");
    setNewItemQuantity("");
    setIsAdding(false);
  };

  const openPurchaseReview = () => {
    const selectedItems = cartItems.filter((item) => checkedItemIds.has(item.itemId));
    setPurchaseDrafts(selectedItems.map((item) => ({
      item,
      expirationDate: "",
      locationCategory: "REFRIGERATED",
      quantity: purchaseQuantityDraftFromCartItem(item),
    })));
    setPurchaseError(null);
    setReviewVisible(true);
  };

  const updatePurchaseDraft = (itemId: number, patch: Partial<PurchaseDraft>) => {
    setPurchaseDrafts((current) => current.map((draft) =>
      draft.item.itemId === itemId ? { ...draft, ...patch } : draft,
    ));
  };

  const validPurchaseDrafts = purchaseDrafts.length > 0 && purchaseDrafts.every((draft) => {
    if (!isValidDateInput(draft.expirationDate)) return false;
    return validateQuantityDraft(draft.quantity);
  });

  const completePurchase = async () => {
    if (!validPurchaseDrafts || mutating) return;

    setMutating(true);
    setError(null);
    setMessage(null);
    setPurchaseError(null);
    try {
      const results = await Promise.allSettled(
        purchaseDrafts.map((draft) => buyCartItem(draft.item.itemId, {
          expirationDate: draft.expirationDate,
          locationCategory: draft.locationCategory,
          ...purchaseQuantityPayload(draft.quantity),
        })),
      );
      const succeededIds = new Set<number>();
      const failedDrafts: PurchaseDraft[] = [];
      results.forEach((result, index) => {
        const draft = purchaseDrafts[index];
        if (result.status === "fulfilled") succeededIds.add(draft.item.itemId);
        else failedDrafts.push(draft);
      });
      const purchasedCount = succeededIds.size;
      if (purchasedCount === 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );
        throw firstFailure?.reason ?? new Error("구매 처리에 실패했습니다.");
      }
      const completedAt = new Date().toISOString();
      const completedItems: RecentPurchase[] = purchaseDrafts
        .filter((draft) => succeededIds.has(draft.item.itemId))
        .map((draft, index) => ({
          id: `${Date.now()}-${draft.item.itemId}-${index}`,
          itemId: draft.item.itemId,
          itemName: draft.item.itemName,
          quantityText: purchaseQuantityText(draft.quantity),
          locationCategory: draft.locationCategory,
          expirationDate: draft.expirationDate,
          completedAt,
        }));
      const nextRecent = mergeRecentPurchases(recentPurchases, completedItems);
      setRecentPurchases(nextRecent);
      let historySaved = true;
      if (currentFridge && session?.userId) {
        try {
          await storeRecentPurchases(session.userId, currentFridge.fridgeId, nextRecent);
        } catch {
          historySaved = false;
          setRecentError("구매와 재고 등록은 완료됐지만 최근 내역을 이 기기에 저장하지 못했어요.");
        }
      }
      setCartItems((current) => current.filter((item) => !succeededIds.has(item.itemId)));
      setCheckedItemIds(new Set(failedDrafts.map((draft) => draft.item.itemId)));
      setPurchaseDrafts(failedDrafts);
      if (failedDrafts.length > 0) {
        const resultMessage = `${purchasedCount}개 완료, ${failedDrafts.length}개 실패했어요. 실패한 품목을 확인해 다시 시도해 주세요.`;
        setMessage(resultMessage);
        setPurchaseError(resultMessage);
      } else {
        setMessage(historySaved ? `${purchasedCount}개 품목을 구매 완료하고 냉장고 재고로 옮겼어요.` : `${purchasedCount}개 품목을 냉장고 재고로 옮겼어요.`);
        setReviewVisible(false);
      }
    } catch (purchaseError) {
      setPurchaseError(getApiErrorMessage(purchaseError, "구매 완료 처리에 실패했습니다."));
    } finally {
      setMutating(false);
    }
  };

  const removeRecentPurchase = async (id?: string) => {
    if (!currentFridge || !session?.userId) return;
    const next = id ? recentPurchases.filter((item) => item.id !== id) : [];
    setRecentError(null);
    try {
      await storeRecentPurchases(session.userId, currentFridge.fridgeId, next);
      setRecentPurchases(next);
    } catch {
      setRecentError("최근 구매 완료 내역을 지우지 못했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>장바구니</Text>
          <Text style={styles.description}>
            {currentFridge
              ? `${currentFridge.fridgeName}에 필요한 재료를 관리하세요.`
              : "필요한 재료를 미리 담아두세요."}
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCart()} tintColor={Colors.main} colors={[Colors.main]} />}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.statusText}>{message}</Text> : null}

          {currentFridge ? <PersonalizedShopping
            key={currentFridge.fridgeId}
            fridgeId={currentFridge.fridgeId}
            onSelect={(name, quantity, title) => {
              setNewItemName(name);
              setNewItemQuantity(quantity);
              setSourceRecipe(title);
              setIsAdding(true);
              setMessage("아래 추가 입력란에서 수량을 확인하고 추가해주세요.");
            }}
          /> : null}

          <View style={styles.cartCard}>
            <View style={styles.cartHeader}>
              <View style={styles.cartTitleContainer}>
                <MaterialCommunityIcons
                  name="cart-outline"
                  size={22}
                  color={Colors.main}
                />
                <Text style={styles.cartTitle}>장바구니</Text>
              </View>
              <Text style={styles.itemCount}>{cartItems.length}개</Text>
            </View>

            {loading || fridgeLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator color={Colors.main} />
                <Text style={styles.emptyText}>장바구니를 불러오는 중입니다.</Text>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="cart-outline"
                  size={44}
                  color={Colors.line}
                />
                <Text style={styles.emptyTitle}>장바구니가 비어 있어요</Text>
                <Text style={styles.emptyText}>
                  레시피 부족 재료나 필요한 품목을 추가해 보세요.
                </Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {cartItems.map((item, index) => {
                  const checked = checkedItemIds.has(item.itemId);
                  return (
                    <View
                      key={item.itemId}
                      style={[
                        styles.itemRow,
                        checked && styles.itemRowChecked,
                        index === cartItems.length - 1 && styles.lastItemRow,
                      ]}
                    >
                      <Pressable
                        style={styles.checkButton}
                        onPress={() => toggleItem(item.itemId)}
                        hitSlop={6}
                        disabled={mutating}
                      >
                        <MaterialCommunityIcons
                          name={
                            checked
                              ? "checkbox-marked"
                              : "checkbox-blank-outline"
                          }
                          size={24}
                          color={checked ? Colors.main : Colors.subText}
                        />
                      </Pressable>

                      <View style={styles.iconContainer}>
                        <IngredientIcon name={item.itemName} category={item.category} iconName={item.iconName} style={styles.categoryIcon} />
                      </View>

                      <Pressable
                        style={styles.itemInfo}
                        onPress={() => toggleItem(item.itemId)}
                        disabled={mutating}
                      >
                        <Text
                          numberOfLines={1}
                          style={[styles.itemName, checked && styles.checkedText]}
                        >
                          {item.itemName}
                        </Text>
                        {checked ? <Text style={styles.purchasePendingText}>선택됨</Text> : null}
                      </Pressable>

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.quantity,
                          checked && styles.checkedQuantity,
                        ]}
                      >
                        {quantityText(item)}
                      </Text>
                      <Pressable
                      style={styles.coupangButton}
                      onPress={() => openShoppingLink(item.itemName, "coupang")}
                      disabled={mutating}
                      >
                        <Text style={styles.coupangButtonText}>쿠팡</Text>
                      </Pressable>

                        <Pressable
                      style={styles.kurlyButton}
                      onPress={() => openShoppingLink(item.itemName, "kurly")}
                      disabled={mutating}
                      >
                        <Text style={styles.kurlyButtonText}>컬리</Text>
                      </Pressable>

                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => void deleteItem(item.itemId)}
                        hitSlop={8}
                        disabled={mutating}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={19}
                          color={Colors.subText}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {checkedCount > 0 ? <View style={styles.purchaseActionPanel}>
            <View style={styles.purchaseActionCopy}><Text style={styles.purchaseActionTitle}>{checkedCount}개 품목 구매 완료</Text><Text style={styles.purchaseActionDescription}>수량·보관 위치·소비기한을 확인한 뒤 냉장고 재고로 옮겨요.</Text></View>
            <Pressable style={styles.purchaseActionButton} onPress={openPurchaseReview} disabled={mutating} accessibilityRole="button" accessibilityLabel={`선택한 ${checkedCount}개 품목 구매 완료하기`}>
              {mutating ? <ActivityIndicator color={Colors.white} /> : <MaterialCommunityIcons name="cart-check" size={20} color={Colors.white} />}
              <Text style={styles.purchaseActionButtonText}>구매 완료하기</Text>
            </Pressable>
          </View> : null}

          {isAdding ? (
            <View style={styles.addBox}>
              <Text style={styles.addBoxTitle}>품목 추가</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="품목명"
                  placeholderTextColor={Colors.subText}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
                <TextInput
                  style={[styles.input, styles.quantityInput]}
                  placeholder="예: 2개"
                  placeholderTextColor={Colors.subText}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                />
              </View>
              <View style={styles.addActionRow}>
                <Pressable style={styles.cancelButton} onPress={cancelAddItem}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmButton,
                    (!newItemName.trim() || mutating) &&
                      styles.confirmButtonDisabled,
                  ]}
                  onPress={() => void addItem()}
                  disabled={!newItemName.trim() || mutating}
                >
                  {mutating ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>추가</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.addButton}
              onPress={() => setIsAdding(true)}
              disabled={!currentFridge || mutating}
            >
              <MaterialCommunityIcons name="plus" size={21} color={Colors.main} />
              <Text style={styles.addButtonText}>품목 추가</Text>
            </Pressable>
          )}

          {recentPurchases.length > 0 ? <View style={styles.recentSection}>
            <View style={styles.recentHeader}><View><Text style={styles.recentTitle}>최근 구매 완료</Text><Text style={styles.recentDescription}>구매 후 냉장고 재고로 옮긴 품목이에요.</Text></View><Pressable style={styles.recentClear} onPress={() => void removeRecentPurchase()} accessibilityLabel="최근 구매 완료 내역 전체 지우기"><Text style={styles.recentClearText}>전체 지우기</Text></Pressable></View>
            {recentPurchases.map((item, index) => <View key={item.id} style={[styles.recentRow, index === recentPurchases.length - 1 && styles.recentLastRow]}>
              <View style={styles.recentIcon}><MaterialCommunityIcons name="check" size={18} color={Colors.white} /></View>
              <View style={styles.recentCopy}><Text style={styles.recentItemName} numberOfLines={1}>{item.itemName}</Text><Text style={styles.recentMeta}>{item.quantityText} · {item.locationCategory === "REFRIGERATED" ? "냉장" : item.locationCategory === "FROZEN" ? "냉동" : "상온"} · {item.expirationDate}</Text><Text style={styles.recentTime}>{new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.completedAt))}</Text></View>
              <Pressable style={styles.recentRemove} onPress={() => void removeRecentPurchase(item.id)} accessibilityLabel={`${item.itemName} 구매 완료 내역 지우기`}><MaterialCommunityIcons name="close" size={19} color={Colors.subText} /></Pressable>
            </View>)}
          </View> : null}
          {recentError ? <Text style={styles.recentError} accessibilityRole="alert">{recentError}</Text> : null}
        </ScrollView>

        <View style={styles.bottomContainer}>
          {checkedCount > 0 && (
            <Text style={styles.checkedCount}>
              {checkedCount}개 품목을 선택했어요
            </Text>
          )}
          <Pressable
            style={[
              styles.completeButton,
              (checkedCount === 0 || mutating) && styles.completeButtonDisabled,
            ]}
            onPress={openPurchaseReview}
            disabled={checkedCount === 0 || mutating}
          >
            {mutating ? (
              <ActivityIndicator color={Colors.subText} />
            ) : (
              <MaterialCommunityIcons
                name="check"
                size={21}
                color={checkedCount === 0 ? Colors.subText : Colors.white}
              />
            )}
            <Text
              style={[
                styles.completeButtonText,
                (checkedCount === 0 || mutating) &&
                  styles.completeButtonTextDisabled,
              ]}
            >
              {checkedCount > 0 ? `${checkedCount}개 구매 완료하기` : "품목을 선택해 주세요"}
            </Text>
          </Pressable>
        </View>

        <Modal visible={reviewVisible} animationType="slide" transparent onRequestClose={() => !mutating && setReviewVisible(false)}>
          <View style={styles.reviewModalRoot}>
            <Pressable style={styles.reviewBackdrop} onPress={() => !mutating && setReviewVisible(false)} />
            <View style={styles.reviewSheet}>
              <View style={styles.reviewHandle} />
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderCopy}>
                  <Text style={styles.reviewTitle}>구매 정보 확인</Text>
                  <Text style={styles.reviewDescription}>레시피 필요량과 별개로, 실제 구매한 재고량·위치·소비기한을 확인해 주세요.</Text>
                </View>
                <Pressable style={styles.reviewClose} onPress={() => setReviewVisible(false)} disabled={mutating} accessibilityLabel="구매 정보 확인 닫기">
                  <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled">
                {purchaseDrafts.map((draft) => (
                  <View key={draft.item.itemId} style={styles.reviewItem}>
                    <View style={styles.reviewItemHeading}>
                      <IngredientIcon name={draft.item.itemName} category={draft.item.category} iconName={draft.item.iconName} style={styles.reviewItemIcon} />
                      <Text style={styles.reviewItemName} numberOfLines={2}>{draft.item.itemName}</Text>
                    </View>
                    {draft.item.sourceType === "RECIPE" ? <View style={styles.recipeRequirement}><MaterialCommunityIcons name="silverware-fork-knife" size={17} color={Colors.orangeDark} /><View style={styles.recipeRequirementCopy}><Text style={styles.recipeRequirementLabel}>레시피 필요량</Text><Text style={styles.recipeRequirementValue}>{quantityText(draft.item)}</Text></View><Text style={styles.recipeRequirementHint}>참고용</Text></View> : null}
                    <Text style={styles.reviewLabel}>구매 후 재고량</Text>
                    <QuantitySelector value={draft.quantity} onChange={(quantity) => updatePurchaseDraft(draft.item.itemId, { quantity })} disabled={mutating} />
                    <Text style={styles.reviewLabel}>보관 위치</Text>
                    <View style={styles.reviewChoiceRow}>
                      {storageOptions.map((option) => {
                        const selected = draft.locationCategory === option.value;
                        return <Pressable key={option.value} style={[styles.reviewChoice, selected && styles.reviewChoiceSelected]} onPress={() => updatePurchaseDraft(draft.item.itemId, { locationCategory: option.value })} disabled={mutating}><Text style={[styles.reviewChoiceText, selected && styles.reviewChoiceTextSelected]}>{option.label}</Text></Pressable>;
                      })}
                    </View>
                    <Text style={styles.reviewLabel}>소비기한</Text>
                    <TextInput
                      style={[styles.reviewDateInput, draft.expirationDate.length > 0 && !isValidDateInput(draft.expirationDate) && styles.reviewInputError]}
                      value={draft.expirationDate}
                      onChangeText={(value) => updatePurchaseDraft(draft.item.itemId, { expirationDate: formatDateInput(value) })}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.subText}
                      keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                      maxLength={10}
                      editable={!mutating}
                    />
                  </View>
                ))}
                {purchaseError ? <Text style={styles.reviewError}>{purchaseError}</Text> : null}
              </ScrollView>
              <View style={styles.reviewFooter}>
                <Pressable style={[styles.reviewSubmit, (!validPurchaseDrafts || mutating) && styles.completeButtonDisabled]} onPress={() => void completePurchase()} disabled={!validPurchaseDrafts || mutating}>
                  {mutating ? <ActivityIndicator color={Colors.white} /> : <MaterialCommunityIcons name="fridge-outline" size={21} color={validPurchaseDrafts ? Colors.white : Colors.subText} />}
                  <Text style={[styles.completeButtonText, (!validPurchaseDrafts || mutating) && styles.completeButtonTextDisabled]}>{mutating ? "재고에 반영 중" : `${purchaseDrafts.length}개 재고로 옮기기`}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
