import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { completeRecipeCooking, previewRecipeConsumption, type RecipeResponse } from "../../api/recipeApi";
import type { MealRecordPayload, MealType } from "../../api/calendarApi";
import type { InventoryItem } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";

type Row = { stock: InventoryItem; selected: boolean; amount: string };
const meals: [MealType, string][] = [["BREAKFAST", "아침"], ["LUNCH", "점심"], ["DINNER", "저녁"], ["SNACK", "간식"]];

export function CookingCompleteModal({ recipe, fridgeId, visible, onClose, onDone }: {
  recipe: RecipeResponse; fridgeId: number; visible: boolean; onClose: () => void; onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>("DINNER");
  const [submitted, setSubmitted] = useState(false);
  const pending = useRef<MealRecordPayload | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    pending.current = null;
    setSubmitted(false);
  }, [recipe, fridgeId]);

  useEffect(() => {
    if (!visible || pending.current) return;
    let active = true;
    setLoading(true);
    setReady(false);
    setError(null);
    previewRecipeConsumption(fridgeId, recipe.ingredients).then((result) => {
      if (!active) return;
      setWarnings(result.warnings);
      setRows(result.items.map(({ stock, quantityUsed }) => ({ stock, selected: quantityUsed > 0, amount: quantityUsed > 0 ? String(quantityUsed) : "" })));
      setReady(true);
    }).catch((e) => active && setError(getApiErrorMessage(e, "재고를 불러오지 못했어요. 창을 닫고 다시 시도해주세요.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [visible, fridgeId, recipe]);

  const save = async () => {
    if (busy.current || !recipe.recipeKey) return;
    setError(null);
    if (!pending.current) {
      const selected = rows.filter((row) => row.selected);
      for (const { stock, amount } of selected) {
        if (stock.unitType === "CUSTOM" ? !amount.trim()
          : !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > (stock.remainingQuantity ?? 0)) {
          setError(`${stock.ingredientName}: 현재 잔량 이내의 사용량을 입력해주세요. 직접 입력 재고는 사용 후 남은 상태를 적어주세요.`);
          return;
        }
      }
      const now = new Date();
      // 백엔드의 LocalDateTime 기준(Asia/Seoul)에 맞춘다.
      const localTime = new Date(now.getTime() + 9 * 60 * 60000).toISOString().slice(0, 19);
      pending.current = {
        requestId: `cook-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
        fridgeId, title: recipe.recipeName, mealType, eatenAt: localTime,
        usedIngredients: selected.map(({ stock, amount }) => ({
          batchId: stock.batchId, unitType: stock.unitType,
          ...(stock.unitType === "CUSTOM" ? { customText: amount.trim() }
            : { quantityUsed: Number(amount), unit: stock.unit ?? undefined }),
        })),
      };
      setSubmitted(true);
    }
    busy.current = true;
    setSaving(true);
    try {
      await completeRecipeCooking(recipe.recipeKey, pending.current);
      onDone();
    } catch (e) {
      if (isAxiosError(e) && [400, 403, 404, 422].includes(e.response?.status ?? 0)) {
        // 명시적으로 거절된 요청만 수정 가능하게 한다. 통신 오류는 동일 요청을 유지한다.
        pending.current = null;
        setSubmitted(false);
      }
      // 응답 유실 시 같은 ID/본문으로 재시도해서 이중 차감을 막는다.
      setError(getApiErrorMessage(e, "완료 여부를 확인하지 못했어요. 같은 내용으로 다시 시도해주세요."));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !saving && onClose()}>
    <View style={s.overlay}><View style={s.panel}>
      <Text style={s.title}>요리 완료 · 사용량 확인</Text>
      <Text>{recipe.recipeName}</Text>
      <Text style={s.hint}>같은 단위 또는 직접 등록한 개당 용량으로만 계산했어요. 실제 사용량을 확인해주세요. 선택한 재고만 차감합니다.</Text>
      {warnings.map((warning, i) => <Text key={i} style={s.hint}>{warning}</Text>)}
      <View style={s.choices}>{meals.map(([value, label]) => <Pressable key={value} disabled={submitted} onPress={() => setMealType(value)} style={[s.choice, mealType === value && s.selected]}><Text>{label}</Text></Pressable>)}</View>
      {loading ? <ActivityIndicator /> : <ScrollView keyboardShouldPersistTaps="handled">
        {rows.length === 0 && <Text style={s.hint}>이 레시피와 이름이 일치하는 사용 가능한 재고가 없습니다. 재고 차감 없이 식사만 기록할 수 있어요.</Text>}
        {rows.map((row, index) => <View key={row.stock.batchId} style={s.row}>
          <Pressable disabled={submitted} accessibilityRole="checkbox" accessibilityState={{ checked: row.selected }} onPress={() => setRows((items) => items.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))}>
            <Text style={s.name}>{row.selected ? "☑" : "☐"} {row.stock.ingredientName}</Text>
            <Text>잔량 {row.stock.customQuantityText ?? `${row.stock.remainingQuantity ?? "?"}${row.stock.unit ?? ""}`} · 소비기한 {row.stock.consumeByDate ?? "미상"}</Text>
            <Text>{row.stock.countBasis ?? ""}{row.stock.quantityNeedsReview ? " · 재고 상세에서 수량 확인 필요" : ""}</Text>
          </Pressable>
          {row.selected && <TextInput style={s.input} editable={!submitted} value={row.amount}
            keyboardType={row.stock.unitType === "CUSTOM" ? "default" : "decimal-pad"}
            accessibilityLabel={`${row.stock.ingredientName} 사용량`}
            placeholder={row.stock.unitType === "CUSTOM" ? "사용 후 남은 상태 (전부 사용: 0)" : `사용량 (${row.stock.unit ?? "재고 단위"})`}
            onChangeText={(amount) => setRows((items) => items.map((item, i) => i === index ? { ...item, amount } : item))} />}
          {row.selected && <Text>차감 후: {row.stock.unitType === "CUSTOM"
            ? row.amount.trim() || "남은 상태를 입력해주세요"
            : Number.isFinite(Number(row.amount))
              ? `${Number(((row.stock.remainingQuantity ?? 0) - Number(row.amount || 0)).toFixed(6))}${row.stock.unit ?? ""}`
              : "사용량을 확인해주세요"}</Text>}
        </View>)}
      </ScrollView>}
      {error && <Text style={s.error}>{error}</Text>}
      {submitted && <Text style={s.hint}>재시도는 같은 요청으로 처리합니다. 응답이 없더라도 중복 차감하지 않아요.</Text>}
      <Pressable style={s.submit} disabled={saving || loading || !ready || !recipe.recipeKey} onPress={() => void save()}>
        <Text style={s.submitText}>{saving ? "저장 중…" : submitted ? "같은 요청으로 다시 시도" : rows.some((row) => row.selected) ? "재고 차감하고 식사 기록" : "재고 차감 없이 식사 기록"}</Text>
      </Pressable>
      <Pressable style={s.choice} disabled={saving} onPress={onClose}><Text>닫기</Text></Pressable>
    </View></View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 20 },
  panel: { backgroundColor: "white", borderRadius: 16, padding: 20, maxHeight: "90%", width: "100%", maxWidth: 600, alignSelf: "center", gap: 12 },
  title: { fontSize: 20, fontWeight: "bold" }, hint: { color: "#666", lineHeight: 21 },
  choices: { flexDirection: "row", gap: 8 }, choice: { padding: 12, borderRadius: 8, backgroundColor: "#eee", alignItems: "center" },
  selected: { backgroundColor: "#cddbbb" }, row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#ddd", gap: 8 },
  name: { fontWeight: "bold", fontSize: 16 }, input: { borderWidth: 1, borderColor: "#bbb", borderRadius: 8, padding: 12 },
  submit: { backgroundColor: "#586e40", padding: 16, borderRadius: 8, alignItems: "center" }, submitText: { color: "white", fontWeight: "bold" }, error: { color: "#b22" },
});
