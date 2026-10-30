import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { registerContainer, registerContainerWithSplit, type ContainerScanResponse } from "../api/containerApi";
import { Colors } from "../constants/colors";
import type { FridgeSummary, InventoryItem } from "../types/fridge";
import { formatDateInput, isValidDateInput } from "../utils/dateInput";
import { getApiErrorMessage } from "../utils/apiError";
import { initialQuantityDraft, quantityDraftText, toQuantityPayload, validateQuantityDraft, type QuantityDraft } from "../utils/inventoryQuantity";
import { QuantitySelector } from "./QuantitySelector";

type Props = {
  token: string;
  fridge: FridgeSummary;
  inventories: InventoryItem[];
  inventoryLoading?: boolean;
  inventoryError?: string | null;
  retryInventories?: () => void;
  disabled?: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
  onRegistered: (container: ContainerScanResponse) => void;
};

const initialQuantity: QuantityDraft = initialQuantityDraft();
const storageOptions = [
  ["REFRIGERATED", "냉장"], ["FROZEN", "냉동"], ["ROOM_TEMPERATURE", "상온"], ["SEASONING", "조미료"],
] as const;

function inventoryQuantity(item: InventoryItem) {
  if (item.unitType === "CUSTOM") return item.customQuantityText || "수량 미정";
  return item.remainingQuantity === null ? "수량 미정" : `${item.remainingQuantity}${item.unit ?? (item.unitType === "PERCENT" ? "%" : "")}`;
}

function splitQuantity(value: string) {
  return Number(value.trim().replace(",", "."));
}

function initialContainerQuantity(item: InventoryItem): QuantityDraft {
  const draft = initialQuantityDraft();
  if (item.unitType === "PERCENT") return { ...draft, mode: "percent", percent: 50 };
  if (item.unitType === "CUSTOM") return { ...draft, mode: "custom" };
  return draft;
}

function quantityModeLabel(item: InventoryItem) {
  if (item.unitType === "PERCENT") return "퍼센트";
  if (item.unitType === "CUSTOM") return "직접 입력";
  return "개수";
}

export function ContainerRegistrationForm({ token, fridge, inventories, inventoryLoading = false, inventoryError, retryInventories, disabled = false, onSubmittingChange, onRegistered }: Props) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [containerName, setContainerName] = useState("스마트 용기");
  const [ingredientName, setIngredientName] = useState("");
  const [consumeByDate, setConsumeByDate] = useState("");
  const [locationCategory, setLocationCategory] = useState<(typeof storageOptions)[number][0]>("REFRIGERATED");
  const [quantity, setQuantity] = useState<QuantityDraft>(initialQuantity);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [sourceRemaining, setSourceRemaining] = useState("");
  const [containerQuantity, setContainerQuantity] = useState<QuantityDraft>(initialQuantity);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode("new"); setContainerName("스마트 용기"); setIngredientName(""); setConsumeByDate("");
    setQuantity(initialQuantityDraft()); setSelectedBatchId(null); setInventoryQuery(""); setSourceRemaining(""); setContainerQuantity(initialQuantityDraft()); setError(null);
  }, [fridge.fridgeId, token]);

  const selectedInventory = useMemo(() => inventories.find((item) => item.batchId === selectedBatchId) ?? null, [inventories, selectedBatchId]);
  const filteredInventories = useMemo(() => {
    const keyword = inventoryQuery.trim().toLocaleLowerCase("ko-KR");
    return keyword
      ? inventories.filter((item) => item.ingredientName.toLocaleLowerCase("ko-KR").includes(keyword))
      : inventories;
  }, [inventories, inventoryQuery]);
  const matchingInventories = filteredInventories.slice(0, 30);
  const newError: string | null = !ingredientName.trim() ? "재료명을 입력해 주세요." : !isValidDateInput(consumeByDate) ? "소비기한을 YYYY-MM-DD 형식으로 입력해 주세요." : !validateQuantityDraft(quantity) ? "용량을 올바르게 입력해 주세요." : null;
  const sourceRemainingAmount = splitQuantity(sourceRemaining);
  const currentAmount = selectedInventory?.remainingQuantity ?? null;
  const numericSplit = selectedInventory?.unitType !== "CUSTOM";
  const transferredAmount = currentAmount === null ? Number.NaN : currentAmount - sourceRemainingAmount;
  const existingError: string | null = !selectedInventory
    ? "용기에 옮길 기존 재고를 선택해 주세요."
    : selectedInventory.status !== "ACTIVE"
      ? "사용 가능한 재고만 QR 용기에 옮길 수 있어요."
      : selectedInventory.quantityNeedsReview
        ? "재고 상세 화면에서 현재 잔량을 먼저 확인해 주세요."
        : numericSplit
          ? currentAmount === null
            ? "현재 재고 잔량을 확인할 수 없어요."
            : !Number.isFinite(sourceRemainingAmount) || sourceRemainingAmount < 0 || sourceRemainingAmount >= currentAmount
              ? "용기에 옮긴 만큼 기존 재고의 잔량을 줄여 입력해 주세요."
              : !validateQuantityDraft(containerQuantity)
                ? "QR 용기에 담긴 양을 올바르게 입력해 주세요."
                : null
          : !sourceRemaining.trim()
            ? "기존 재고에 남은 상태를 입력해 주세요."
            : sourceRemaining.trim() === (selectedInventory.customQuantityText ?? "").trim()
              ? "용기에 옮긴 뒤 기존 재고의 상태를 수정해 주세요."
              : !validateQuantityDraft(containerQuantity)
                ? "QR 용기에 담긴 양을 올바르게 입력해 주세요."
              : null;
  const busy = disabled || submitting;

  const submitNew = async () => {
    if (newError || busy) { setError(newError); return; }
    const amount = toQuantityPayload(quantity);
    setSubmitting(true); onSubmittingChange?.(true); setError(null);
    try {
      const result = await registerContainer({
        qrCodeToken: token, fridgeId: fridge.fridgeId, containerName: containerName.trim() || "스마트 용기",
        ingredientName: ingredientName.trim(), consumeByDate, locationCategory, ...amount,
      });
      onRegistered(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "용기와 재료를 등록하지 못했어요. 입력은 유지됩니다."));
    } finally { setSubmitting(false); onSubmittingChange?.(false); }
  };

  const submitExisting = async () => {
    if (existingError || busy || !selectedInventory) { setError(existingError); return; }
    const containerAmount = toQuantityPayload(containerQuantity);
    setSubmitting(true); onSubmittingChange?.(true); setError(null);
    try {
      const registered = await registerContainerWithSplit({
        qrCodeToken: token, fridgeId: fridge.fridgeId, sourceBatchId: selectedInventory.batchId,
        transferredQuantity: numericSplit ? transferredAmount : null,
        sourceRemainingQuantity: numericSplit ? sourceRemainingAmount : null,
        transferredText: null,
        sourceRemainingText: numericSplit ? null : sourceRemaining.trim(),
        sourceUnit: selectedInventory.unit,
        containerUnitType: containerAmount.unitType,
        containerRemainingQuantity: containerAmount.remainingQuantity,
        containerRemainingText: containerAmount.customQuantityText,
        containerName: containerName.trim() || "스마트 용기",
      });
      onRegistered(registered);
    } catch (requestError) { setError(getApiErrorMessage(requestError, "기존 재고에서 용기로 옮기지 못했어요.")); }
    finally { setSubmitting(false); onSubmittingChange?.(false); }
  };

  return <View>
    <View style={styles.modeRow}>
      {(["new", "existing"] as const).map((value) => <Pressable key={value} style={[styles.mode, mode === value && styles.modeSelected]} onPress={() => { setMode(value); setError(null); }} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: mode === value }}><Text style={[styles.modeText, mode === value && styles.modeTextSelected]}>{value === "new" ? "새 재료 등록" : "기존 재고 연결"}</Text></Pressable>)}
    </View>
    <Text style={styles.label}>용기 이름</Text><TextInput style={styles.input} value={containerName} onChangeText={setContainerName} editable={!busy} maxLength={40} placeholder="예: 반찬통 1" placeholderTextColor={Colors.subText} />
    {mode === "new" ? <>
      <Text style={styles.label}>재료명</Text><TextInput style={styles.input} value={ingredientName} onChangeText={setIngredientName} editable={!busy} maxLength={40} placeholder="예: 당근" placeholderTextColor={Colors.subText} />
      <Text style={styles.label}>수량 관리 방식</Text><QuantitySelector value={quantity} onChange={setQuantity} disabled={busy} />
      <Text style={styles.label}>보관 위치</Text><View style={styles.wrap}>{storageOptions.map(([value, label]) => <Pressable key={value} style={[styles.chip, locationCategory === value && styles.chipSelected]} onPress={() => setLocationCategory(value)} disabled={busy}><Text style={[styles.chipText, locationCategory === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>
      <Text style={styles.label}>소비기한</Text><TextInput style={styles.input} value={consumeByDate} onChangeText={(value) => setConsumeByDate(formatDateInput(value))} editable={!busy} keyboardType="number-pad" maxLength={10} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.subText} />
      <Pressable style={[styles.primary, (!!newError || busy) && styles.disabled]} disabled={!!newError || busy} onPress={() => void submitNew()}>{submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>용기와 새 재료 등록</Text>}</Pressable>
    </> : <>
      <Text style={styles.label}>냉장고 재료 검색</Text>
      <TextInput style={styles.input} value={inventoryQuery} onChangeText={setInventoryQuery} editable={!busy} maxLength={40} placeholder="예: 두부, 우유" placeholderTextColor={Colors.subText} accessibilityLabel="기존 냉장고 재료 검색" />
      {inventoryLoading ? <ActivityIndicator color={Colors.mainStrong} /> : inventoryError ? <Pressable style={styles.notice} onPress={retryInventories}><Text style={styles.noticeText}>{inventoryError} 눌러서 다시 시도해 주세요.</Text></Pressable> : <>
        <Text style={styles.resultCount}>{inventoryQuery.trim() ? `검색 결과 ${filteredInventories.length}개` : `연결 가능한 재고 ${inventories.length}개`}{filteredInventories.length > matchingInventories.length ? " · 상위 30개 표시" : ""}</Text>
        {matchingInventories.length ? <View>{matchingInventories.map((item) => {
          const selected = selectedBatchId === item.batchId;
          return <View key={item.batchId} style={styles.inventoryGroup}>
            <Pressable
              style={[styles.inventory, selected && styles.inventorySelected]}
              onPress={() => {
                setSelectedBatchId(item.batchId);
                setSourceRemaining(item.unitType === "CUSTOM" ? item.customQuantityText ?? "" : String(item.remainingQuantity ?? ""));
                setContainerQuantity(initialContainerQuantity(item));
                setError(null);
              }}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View style={styles.inventoryCopy}>
                <Text style={styles.inventoryTitle}>{item.ingredientName}</Text>
                <Text style={styles.inventoryMeta}>{inventoryQuantity(item)} · {item.consumeByDate || "날짜 없음"}{item.status === "EXPIRED" ? " · 기한 경과" : ""}</Text>
              </View>
              <MaterialCommunityIcons name={selected ? "radiobox-marked" : "radiobox-blank"} size={22} color={Colors.mainStrong} />
            </Pressable>
            {selected ? <View style={styles.inventoryEditor}>
              <View style={styles.methodRow}><Text style={styles.methodLabel}>기존 재고 관리 방식</Text><Text style={styles.methodValue}>{quantityModeLabel(item)}</Text></View>
              <Text style={styles.editorLabel}>{item.unitType === "CUSTOM" ? "기존 재고에 남은 상태" : "기존 재고에 남길 양"}</Text>
              <View style={styles.inputRow}><TextInput style={styles.flexInput} value={sourceRemaining} onChangeText={(value) => { setSourceRemaining(value); setError(null); }} editable={!busy} keyboardType={item.unitType === "CUSTOM" ? "default" : "decimal-pad"} maxLength={40} placeholder={item.unitType === "CUSTOM" ? "예: 반 통" : "예: 0.5"} placeholderTextColor={Colors.subText} accessibilityLabel={item.unitType === "CUSTOM" ? "기존 재고에 남은 상태" : "기존 재고에 남길 양"} />{item.unitType !== "CUSTOM" ? <Text style={styles.unit}>{item.unit ?? (item.unitType === "PERCENT" ? "%" : "개")}</Text> : null}</View>
              <Text style={styles.editorLabel}>QR 용기 수량 관리 방식</Text>
              <QuantitySelector value={containerQuantity} onChange={(next) => { setContainerQuantity(next); setError(null); }} disabled={busy} />
              <Text style={[styles.amountHint, existingError && styles.validationText]}>{existingError ?? `기존 재고는 ${quantityModeLabel(item)} 방식으로 유지되고, QR 용기는 ${quantityDraftText(containerQuantity)}으로 시작합니다.`}</Text>
              <Pressable style={[styles.primary, (!!existingError || busy) && styles.disabled]} disabled={!!existingError || busy} onPress={() => void submitExisting()}>{submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>두 잔량 저장하고 연결</Text>}</Pressable>
            </View> : null}
          </View>;
        })}</View>
          : <Text style={styles.emptyText}>{inventoryQuery.trim() ? "검색어와 일치하는 재고가 없어요." : "연결할 수 있는 냉장고 재고가 없어요."}</Text>}
      </>}
    </>}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 }, mode: { flex: 1, minHeight: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.line, borderRadius: 12 }, modeSelected: { borderColor: Colors.mainStrong, backgroundColor: Colors.lightGreen }, modeText: { fontSize: 12, fontWeight: "700", color: Colors.subText, textAlign: "center" }, modeTextSelected: { color: Colors.mainStrong },
  label: { marginTop: 16, marginBottom: 7, fontSize: 13, fontWeight: "700", color: Colors.text }, input: { minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, color: Colors.text, fontSize: 16 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: 42, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.line, borderRadius: 21 }, chipSelected: { backgroundColor: Colors.mainStrong, borderColor: Colors.mainStrong }, chipText: { color: Colors.text, fontWeight: "600" }, chipTextSelected: { color: Colors.white },
  primary: { minHeight: 52, marginTop: 20, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: Colors.mainStrong }, primaryText: { color: Colors.white, fontSize: 15, fontWeight: "700" }, disabled: { opacity: 0.45 }, error: { marginTop: 12, fontSize: 13, lineHeight: 19, color: Colors.coralDark }, notice: { marginTop: 14, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, backgroundColor: Colors.lightOrange }, noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.orangeDark },
  inventoryGroup: { borderBottomWidth: 1, borderBottomColor: Colors.line }, inventory: { minHeight: 62, paddingVertical: 9, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 8 }, inventorySelected: { backgroundColor: Colors.lightGreen }, inventoryCopy: { flex: 1, minWidth: 0 }, inventoryTitle: { fontSize: 14, fontWeight: "700", color: Colors.text }, inventoryMeta: { marginTop: 3, fontSize: 12, color: Colors.subText }, inventoryEditor: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.lightGreen }, methodRow: { marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, methodLabel: { flex: 1, fontSize: 12, color: Colors.subText }, methodValue: { fontSize: 13, fontWeight: "700", color: Colors.mainStrong }, editorLabel: { marginTop: 12, marginBottom: 8, fontSize: 13, fontWeight: "700", color: Colors.text }, inputRow: { minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.white }, flexInput: { flex: 1, fontSize: 16, color: Colors.text }, unit: { fontSize: 14, fontWeight: "700", color: Colors.mainStrong },
  resultCount: { marginTop: 10, marginBottom: 4, fontSize: 12, fontWeight: "700", color: Colors.mainStrong }, emptyText: { paddingVertical: 22, fontSize: 13, lineHeight: 19, color: Colors.subText, textAlign: "center" },
  amountHint: { marginTop: 9, fontSize: 12, lineHeight: 18, color: Colors.subText }, validationText: { color: Colors.coralDark },
});
