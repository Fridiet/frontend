import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { RecipeResponse } from "../../api/recipeApi";
import { Colors } from "../../constants/colors";
import { IngredientIcon } from "../IngredientIcon";
import { generatedRecipeStyles as styles } from "../../styles/recipeStyles";
import { normalizeIngredientName, type RecipeInventoryResolution } from "../../utils/recipeIngredients";

type GeneratedStep = {
  stepNumber: number;
  description: string;
};

type GeneratedRecipeResultProps = {
  recipe: RecipeResponse;
  saving: boolean;
  saved: boolean;
  addingToCart: boolean;
  feedbackLoading: boolean;
  cartMessage: string | null;
  feedbackMessage: string | null;
  inventoryResolution: RecipeInventoryResolution;
  inventoryLoading: boolean;
  inventoryError: string | null;
  selectedOptionalIngredientNames: ReadonlySet<string>;
  onAddMissingIngredients: () => void;
  onRetryInventory: () => void;
  onToggleOptionalIngredient: (ingredientName: string) => void;
  onSave: () => void;
  onCooked: () => void;
  onDismiss: () => void;
};

function parseSteps(stepsJson: string | null): GeneratedStep[] {
  if (!stepsJson?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(stepsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (step): step is GeneratedStep =>
        typeof step === "object"
        && step !== null
        && typeof (step as GeneratedStep).stepNumber === "number"
        && typeof (step as GeneratedStep).description === "string",
    );
  } catch {
    return [{ stepNumber: 1, description: stepsJson }];
  }
}

function InventorySummary({
  icon,
  label,
  names,
  tone,
}: {
  icon: "fridge-outline" | "cart-outline";
  label: string;
  names: string[];
  tone: "owned" | "missing";
}) {
  const color = tone === "owned" ? Colors.mainStrong : Colors.coralDark;
  return (
    <View style={styles.inventoryRow}>
      <View style={[styles.inventoryIcon, tone === "owned" ? styles.ownedIcon : styles.missingIcon]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.inventoryCopy}>
        <Text style={styles.inventoryLabel}>{label}</Text>
        <Text style={styles.inventoryNames}>{names.length > 0 ? names.join(", ") : "없음"}</Text>
      </View>
      <Text style={[styles.inventoryCount, tone === "owned" ? styles.ownedCount : styles.missingCount]}>{names.length}개</Text>
    </View>
  );
}

export function GeneratedRecipeResult({
  recipe,
  saving,
  saved,
  addingToCart,
  feedbackLoading,
  cartMessage,
  feedbackMessage,
  inventoryResolution,
  inventoryLoading,
  inventoryError,
  selectedOptionalIngredientNames,
  onAddMissingIngredients,
  onRetryInventory,
  onToggleOptionalIngredient,
  onSave,
  onCooked,
  onDismiss,
}: GeneratedRecipeResultProps) {
  const steps = parseSteps(recipe.stepsJson);
  const missingIngredientNames = inventoryResolution.missingIngredients.map((ingredient) => ingredient.nameText);
  const displayIngredients = inventoryResolution.ingredients;
  const reviewNames = inventoryResolution.ingredients.filter((ingredient) => ingredient.needsQuantityReview).map((ingredient) => ingredient.nameText);
  const selectedOptionalCount = inventoryResolution.optionalIngredients.filter((ingredient) => !ingredient.owned && !ingredient.needsQuantityReview && selectedOptionalIngredientNames.has(normalizeIngredientName(ingredient.nameText))).length;
  const cartTargetCount = missingIngredientNames.length + selectedOptionalCount;
  const quantityWarnings = (recipe.ingredientBalances ?? []).filter((item) => item.status !== "ENOUGH");
  const hasRecommendation = recipe.recommendationScore !== null || recipe.recommendationReasons.length > 0;

  return (
    <View style={styles.resultShell}>
      <View style={styles.hero}>
        <MaterialCommunityIcons name="food-variant" size={62} color={Colors.orange} />
      </View>

      <View style={styles.titleArea}>
        <Text style={styles.recipeTitle}>{recipe.recipeName}</Text>
        <Text style={styles.recipeDescription}>
          {recipe.description ?? "냉장고 속 재료로 만드는 맞춤 레시피예요."}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.main} />
            <Text style={styles.metaText}>{recipe.cookTime}분</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="fridge-outline" size={18} color={Colors.main} />
            <Text style={styles.metaText}>보유 {inventoryResolution.ownedIngredients.length}개</Text>
          </View>
        </View>
      </View>

      {hasRecommendation ? (
        <View style={styles.recommendationPanel}>
          <View style={styles.recommendationHeading}>
            <MaterialCommunityIcons name="creation-outline" size={20} color={Colors.mainStrong} />
            <Text style={styles.recommendationTitle}>
              {recipe.recommendationScore !== null
                ? `추천 점수 ${recipe.recommendationScore.toFixed(1)}점`
                : "이 메뉴를 추천한 이유"}
            </Text>
          </View>
          {recipe.recommendationReasons.map((reason, index) => (
            <View key={`${reason}-${index}`} style={styles.reasonRow}>
              <View style={styles.reasonDot} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {inventoryLoading ? (
        <View style={styles.inventoryState}><ActivityIndicator color={Colors.mainStrong} /><Text style={styles.inventoryStateText}>현재 냉장고 재고와 비교하고 있어요.</Text></View>
      ) : inventoryError ? (
        <View style={styles.inventoryErrorState}><Text style={styles.inventoryErrorText}>{inventoryError}</Text><Pressable style={styles.inventoryRetry} onPress={onRetryInventory} accessibilityRole="button"><Text style={styles.inventoryRetryText}>재고 다시 불러오기</Text></Pressable></View>
      ) : (
        <View style={styles.inventoryPanel}>
          <InventorySummary icon="fridge-outline" label="현재 보유 재료" names={inventoryResolution.ownedIngredients.map((ingredient) => ingredient.nameText)} tone="owned" />
          <View style={styles.inventoryDivider} />
          <InventorySummary icon="cart-outline" label="현재 부족 재료" names={missingIngredientNames} tone="missing" />
          {reviewNames.length > 0 ? <Text style={styles.inventoryStateText}>수량·단위 확인 필요: {reviewNames.join(", ")}</Text> : null}
          {recipe.ingredientBalances?.length ? <Text style={styles.inventoryStateText}>추천 시점의 수량 분석입니다. 조리 전 현재 사용량을 다시 확인해주세요.</Text> : null}
        </View>
      )}

      <View style={styles.actionPanel}>
        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressedButton, (saving || saved) && styles.disabledButton]}
          onPress={onSave}
          disabled={saving || saved}
          accessibilityRole="button"
          accessibilityLabel={saved ? "즐겨찾기 저장 완료" : "즐겨찾기 저장"}
        >
          {saving ? <ActivityIndicator color={Colors.white} /> : <MaterialCommunityIcons name={saved ? "bookmark-check" : "bookmark-outline"} size={20} color={Colors.white} />}
          <Text style={styles.saveButtonText}>{saved ? "즐겨찾기 저장됨" : "즐겨찾기 저장"}</Text>
        </Pressable>
        <View style={styles.feedbackRow}>
          <Pressable
            style={({ pressed }) => [styles.feedbackButton, pressed && styles.pressedButton, feedbackLoading && styles.disabledButton]}
            onPress={onCooked}
            disabled={feedbackLoading}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="chef-hat" size={19} color={Colors.mainStrong} />
            <Text style={styles.feedbackButtonText}>요리 완료</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.dismissButton, pressed && styles.pressedButton, feedbackLoading && styles.disabledButton]}
            onPress={onDismiss}
            disabled={feedbackLoading}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="refresh" size={19} color={Colors.subText} />
            <Text style={styles.dismissButtonText}>다른 추천</Text>
          </Pressable>
        </View>
        {feedbackMessage ? <Text style={styles.actionMessage}>{feedbackMessage}</Text> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>재료</Text>
          <Text style={styles.sectionCount}>{displayIngredients.length}개</Text>
        </View>
        {displayIngredients.length > 0 ? (
          <View style={styles.ingredientList}>
            {displayIngredients.map((ingredient, index) => {
              const owned = ingredient.owned;
              const optional = ingredient.availability === "OPTIONAL";
              const unresolved = inventoryLoading || !!inventoryError || ingredient.needsQuantityReview;
              const optionalSelected = selectedOptionalIngredientNames.has(normalizeIngredientName(ingredient.nameText));
              return (
                <View key={`${ingredient.nameText}-${index}`} style={[styles.ingredientRow, index === displayIngredients.length - 1 && styles.lastRow]}>
                  <View style={styles.ingredientIconWrap}>
                    <IngredientIcon name={ingredient.nameText} category={ingredient.category} iconName={ingredient.iconName} style={styles.ingredientImage} />
                  </View>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.nameText}</Text>
                    <Text style={styles.ingredientAmount}>{ingredient.inferred ? "필요 수량 확인" : `${ingredient.quantity}${ingredient.unit}${ingredient.optional ? " · 선택" : ""}`}</Text>
                  </View>
                  {optional && !owned && !unresolved ? <Pressable style={[styles.optionalSelectBadge, optionalSelected && styles.optionalSelectBadgeSelected]} onPress={() => onToggleOptionalIngredient(ingredient.nameText)} accessibilityRole="checkbox" accessibilityState={{ checked: optionalSelected }} accessibilityLabel={`${ingredient.nameText} 선택 재료 장바구니 담기`}><MaterialCommunityIcons name={optionalSelected ? "checkbox-marked" : "checkbox-blank-outline"} size={17} color={optionalSelected ? Colors.white : Colors.mainStrong} /><Text style={[styles.optionalSelectText, optionalSelected && styles.optionalSelectTextSelected]}>{optionalSelected ? "담기 선택" : "담기"}</Text></Pressable> : <View style={[styles.availabilityBadge, unresolved ? styles.optionalBadge : owned ? styles.ownedBadge : optional ? styles.optionalBadge : styles.missingBadge]}>
                    <MaterialCommunityIcons name={unresolved ? "help" : owned ? "check" : optional ? "minus" : "plus"} size={13} color={unresolved ? Colors.subText : owned ? Colors.mainStrong : optional ? Colors.subText : Colors.coralDark} />
                    <Text style={[styles.availabilityText, unresolved ? styles.optionalBadgeText : owned ? styles.ownedBadgeText : optional ? styles.optionalBadgeText : styles.missingBadgeText]}>{unresolved ? "확인" : owned ? "보유" : optional ? "선택" : "부족"}</Text>
                  </View>}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptySectionText}>표시할 재료 정보가 없어요.</Text>
        )}
        {!inventoryLoading && !inventoryError && inventoryResolution.optionalIngredients.some((ingredient) => !ingredient.owned) ? <Text style={styles.optionalHint}>선택 재료는 원하는 항목만 ‘담기’를 체크해 주세요.</Text> : null}
        {!inventoryLoading && !inventoryError && cartTargetCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.cartButton, pressed && styles.pressedButton, addingToCart && styles.disabledButton]}
            onPress={onAddMissingIngredients}
            disabled={addingToCart}
            accessibilityRole="button"
          >
            {addingToCart ? <ActivityIndicator color={Colors.main} /> : <MaterialCommunityIcons name="cart-plus" size={19} color={Colors.main} />}
            <Text style={styles.cartButtonText}>{missingIngredientNames.length > 0 ? `부족 ${missingIngredientNames.length}개` : ""}{missingIngredientNames.length > 0 && selectedOptionalCount > 0 ? " + " : ""}{selectedOptionalCount > 0 ? `선택 ${selectedOptionalCount}개` : ""} 장바구니에 담기</Text>
          </Pressable>
        ) : !inventoryLoading && !inventoryError ? (
          <View style={styles.allOwnedMessage}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.mainStrong} />
            <Text style={styles.allOwnedText}>{quantityWarnings.length > 0
              ? `수량 확인 필요: ${quantityWarnings.map((item) => `${item.name} (${item.status === "UNKNOWN" ? "단위/잔량 확인" : "수량 부족"})`).join(", ")}`
              : recipe.ingredientBalances?.length ? "추천 시점에는 필요 수량을 충족했어요. 조리 전 사용량을 다시 확인해주세요." : "재료명 기준 보유 여부입니다. 실제 사용량을 확인해주세요."}</Text>
          </View>
        ) : null}
        {cartMessage ? <Text style={styles.cartMessage}>{cartMessage}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>조리 순서</Text>
        {steps.length > 0 ? (
          <View style={styles.stepList}>
            {steps.map((step, index) => (
              <View key={`${step.stepNumber}-${index}`} style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{step.stepNumber}</Text></View>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptySectionText}>표시할 조리 순서가 없어요.</Text>
        )}
      </View>
    </View>
  );
}
