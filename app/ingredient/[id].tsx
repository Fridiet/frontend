import { formatDateInput, isValidDateInput } from "../../utils/dateInput";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  deleteInventory,
  getInventory,
  updateInventory,
} from "../../api/inventoryApi";
import { QuantitySelector } from "../../components/QuantitySelector";
import { Colors } from "../../constants/colors";
import type { InventoryItem as InventoryDetail } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  initialQuantityDraft,
  quantityDraftFromInventory,
  quantityDraftText,
  toQuantityPayload,
  validateQuantityDraft,
  type QuantityDraft,
} from "../../utils/inventoryQuantity";
import { ingredientDetailStyles as styles } from "../../styles/appStyles";


const locationLabels: Record<string, string> = {
  REFRIGERATED: "냉장",
  FROZEN: "냉동",
  ROOM_TEMP: "상온",
  SEASONING: "조미료",
};

const storageOptions = [
  {
    key: "REFRIGERATED",
    label: "냉장",
  },
  {
    key: "FROZEN",
    label: "냉동",
  },
  {
    key: "ROOM_TEMP",
    label: "상온",
  },
];

export default function IngredientDetailScreen() {
  const { id } = useLocalSearchParams();

  const batchId = Array.isArray(id) ? id[0] : id;

  const [ingredient, setIngredient] = useState<InventoryDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [editQuantity, setEditQuantity] = useState<QuantityDraft>(initialQuantityDraft);

  const [editConsumeByDate, setEditConsumeByDate] = useState("");

  const [editLocation, setEditLocation] = useState("REFRIGERATED");

  const fetchIngredientDetail = useCallback(async () => {
    if (!batchId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setIngredient(await getInventory(batchId));
    } catch (error) {
      Alert.alert(
        "조회 실패",
        getApiErrorMessage(error, "재료 정보를 불러오지 못했습니다."),
      );
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void fetchIngredientDetail();
  }, [fetchIngredientDetail]);

  const startEdit = () => {
    if (!ingredient) return;

    setEditQuantity(quantityDraftFromInventory(ingredient));

    setEditConsumeByDate(ingredient.consumeByDate || "");

    setEditLocation(ingredient.locationCategory || "REFRIGERATED");

    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!ingredient || !batchId || saving) return;

    if (!isValidDateInput(editConsumeByDate.trim())) {
      Alert.alert("입력 확인", "소비기한을 올바른 날짜로 입력해 주세요. 예: 2026-09-13");
      return;
    }

    if (!validateQuantityDraft(editQuantity)) {
      Alert.alert("입력 확인", "개수나 퍼센트를 확인하거나 직접 입력을 '300g', '1/2통'과 같은 형식으로 입력해 주세요.");
      return;
    }

    const requestBody = {
      ...toQuantityPayload(editQuantity),
      consumeByDate: editConsumeByDate.trim(),
      locationCategory: editLocation,
    };

    try {
      setSaving(true);

      setIngredient(await updateInventory(batchId, requestBody));
      setIsEditing(false);

      Alert.alert("수정 완료", "재료 정보가 수정되었습니다.");
    } catch (error) {
      Alert.alert(
        "수정 실패",
        getApiErrorMessage(error, "재료 수정에 실패했습니다."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!ingredient || !batchId || deleting) return;
    setDeleteChoice(true);
  };

  const deleteIngredient = async (reason: "CONSUMED" | "DISCARDED") => {
    if (!batchId || !ingredient || deleting) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteInventory(batchId, reason);
      router.back();
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, "재료 처리 기록을 저장하지 못했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  const getQuantityText = () => {
    if (!ingredient) return "-";
    const text = quantityDraftText(quantityDraftFromInventory(ingredient));
    return text || "-";
  };

  const getLocationText = () => {
    if (!ingredient) return "-";

    return (
      locationLabels[ingredient.locationCategory] ??
      ingredient.locationCategory ??
      "-"
    );
  };

  const getExpirationMessage = () => {
    if (!ingredient?.dDayText) {
      return "";
    }

    if (ingredient.dDay !== null && ingredient.dDay < 0) {
      return `소비기한이 ${ingredient.dDayText} 지났어요`;
    }

    if (ingredient.dDay === 0) {
      return "소비기한이 오늘까지예요";
    }

    return `소비기한 ${ingredient.dDayText}`;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <Header />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.main} />

          <Text style={styles.loadingText}>재료 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ingredient) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <Header />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            재료 정보를 불러올 수 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Header />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {deleteChoice && <View style={styles.detailCard}>
            <Text style={styles.editGuide}>남은 재료 전체를 어떻게 처리했나요? 선택한 사유와 잔량을 서버에 기록합니다.</Text>
            <Pressable accessibilityRole="button" disabled={deleting} onPress={() => void deleteIngredient("CONSUMED")} style={styles.editButton}><Text style={styles.editButtonText}>다 먹었어요</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={deleting} onPress={() => void deleteIngredient("DISCARDED")} style={styles.deleteButton}><Text style={styles.deleteButtonText}>버렸어요</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={deleting} onPress={() => setDeleteChoice(false)}><Text style={styles.editGuide}>취소</Text></Pressable>
            {deleteError && <Text accessibilityRole="alert">{deleteError}</Text>}
          </View>}
          {/* 재료 이름 */}
          <View style={styles.titleSection}>
            <Text style={styles.ingredientName}>
              {ingredient.ingredientName}
            </Text>

            {!isEditing && (
              <Text style={styles.expirationText}>
                {getExpirationMessage()}
              </Text>
            )}

            {isEditing && (
              <Text style={styles.editGuide}>필요한 정보를 수정해 주세요</Text>
            )}
          </View>

          {!isEditing ? (
            <>
              {/* 상세 보기 */}
              <View style={styles.detailCard}>
                <DetailRow label="재료명" value={ingredient.ingredientName} />

                <DetailRow label="수량" value={getQuantityText()} />

                <DetailRow label="저장 위치" value={getLocationText()} />

                <DetailRow
                  label="소비기한"
                  value={ingredient.consumeByDate}
                  isLast
                />
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.pressedButton,
                  ]}
                  onPress={startEdit}
                >
                  <Text style={styles.editButtonText}>수정</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressedButton,
                    deleting && styles.disabledButton,
                  ]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <Text style={styles.deleteButtonText}>
                    {deleting ? "삭제 중..." : "삭제"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* 수정 모드 */}
              <View style={styles.editCard}>
                <View style={styles.editField}>
                  <Text style={styles.editLabel}>재료명</Text>

                  <View style={styles.readonlyBox}>
                    <Text style={styles.readonlyText}>
                      {ingredient.ingredientName}
                    </Text>
                  </View>
                </View>

                <View style={styles.editField}>
                  <Text style={styles.editLabel}>수량</Text>
                  {ingredient.quantityNeedsReview ? <Text style={styles.editGuide}>기존 수량을 새 방식에 맞게 다시 확인해 주세요.</Text> : null}
                  <QuantitySelector value={editQuantity} onChange={setEditQuantity} disabled={saving} />
                </View>

                <View style={styles.editField}>
                  <Text style={styles.editLabel}>저장 위치</Text>

                  <View style={styles.choiceRow}>
                    {storageOptions.map((item) => (
                      <Choice
                        key={item.key}
                        label={item.label}
                        selected={editLocation === item.key}
                        onPress={() => setEditLocation(item.key)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.editField}>
                  <Text style={styles.editLabel}>소비기한</Text>

                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    accessibilityLabel="소비기한 (연월일 숫자 8자리)"
                    maxLength={10}
                    value={editConsumeByDate}
                    onChangeText={(value) => setEditConsumeByDate(formatDateInput(value))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.subText}
                  />
                  {!isValidDateInput(editConsumeByDate) ? <Text style={{ color: Colors.coralDark, marginTop: 6 }}>올바른 날짜를 입력해 주세요. 예: 2026-09-13</Text> : null}
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.pressedButton,
                  ]}
                  onPress={cancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    pressed && styles.pressedButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? "저장 중..." : "저장"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Text style={styles.backText}>‹</Text>
      </Pressable>

      <Text style={styles.headerTitle}>재료 상세</Text>

      <View style={styles.headerSpace} />
    </View>
  );
}

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Choice({ label, selected, onPress }: ChoiceProps) {
  return (
    <Pressable
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function DetailRow({ label, value, isLast = false }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, isLast && styles.lastDetailRow]}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}
