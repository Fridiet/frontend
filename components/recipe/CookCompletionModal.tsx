import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { InventoryItem } from "../../types/fridge";
import type { CookingIngredientDraft } from "../../utils/recipeCooking";
import { cookingDraftIsValid } from "../../utils/recipeCooking";
import { Colors } from "../../constants/colors";

type Props = {
  visible: boolean;
  recipeName: string;
  inventories: InventoryItem[];
  drafts: CookingIngredientDraft[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: (drafts: CookingIngredientDraft[]) => void;
  onConfirm: () => void;
};

function quantityLabel(item: InventoryItem) {
  if (item.unitType === "CUSTOM") return item.customQuantityText || "수량 미입력";
  return `${item.remainingQuantity ?? "?"}${item.unit ?? ""} 남음`;
}

export function CookCompletionModal(props: Props) {
  const selectedCount = props.drafts.filter((draft) => draft.included).length;
  const valid = selectedCount > 0 && props.drafts.every((draft) => cookingDraftIsValid(draft, props.inventories));

  const updateDraft = (key: string, patch: Partial<CookingIngredientDraft>) => {
    props.onChange(props.drafts.map((draft) => draft.key === key ? { ...draft, ...patch } : draft));
  };

  const selectBatch = (draft: CookingIngredientDraft, item: InventoryItem) => {
    const sameUnit = item.unitType !== "CUSTOM" && item.unit?.trim().toLocaleLowerCase("ko-KR") === draft.ingredient.unit.trim().toLocaleLowerCase("ko-KR");
    updateDraft(draft.key, {
      batchId: item.batchId,
      included: sameUnit,
      value: sameUnit ? String(Math.min(draft.ingredient.quantity, item.remainingQuantity ?? draft.ingredient.quantity)) : "",
    });
  };

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={props.onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>사용한 재료 확인</Text>
              <Text style={styles.description} numberOfLines={2}>{props.recipeName}에 실제로 사용한 재료와 양만 선택해 주세요.</Text>
            </View>
            <Pressable style={styles.close} onPress={props.onClose} disabled={props.submitting} accessibilityLabel="재료 차감 확인 닫기">
              <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {props.loading ? (
              <View style={styles.loadingState}><ActivityIndicator color={Colors.mainStrong} /><Text style={styles.help}>냉장고 재고와 연결하고 있어요.</Text></View>
            ) : props.drafts.map((draft) => {
              const selectedInventory = props.inventories.find((item) => item.batchId === draft.batchId);
              const isValid = cookingDraftIsValid(draft, props.inventories);
              return (
                <View key={draft.key} style={[styles.item, draft.included && styles.itemSelected]}>
                  <View style={styles.itemHeading}>
                    <Pressable
                      style={styles.check}
                      onPress={() => updateDraft(draft.key, { included: !draft.included })}
                      disabled={!draft.batchId || props.submitting}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: draft.included, disabled: !draft.batchId }}
                    >
                      <MaterialCommunityIcons name={draft.included ? "checkbox-marked" : "checkbox-blank-outline"} size={23} color={draft.included ? Colors.mainStrong : Colors.subText} />
                    </Pressable>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName}>{draft.ingredient.nameText}{draft.ingredient.optional ? " · 선택" : ""}</Text>
                      <Text style={styles.recipeAmount}>레시피 {draft.ingredient.quantity}{draft.ingredient.unit}</Text>
                    </View>
                  </View>

                  {draft.inventoryOptions.length ? (
                    <View style={styles.batchList}>
                      {draft.inventoryOptions.map((item) => {
                        const selected = item.batchId === draft.batchId;
                        return (
                          <Pressable key={item.batchId} style={[styles.batchChoice, selected && styles.batchChoiceSelected]} onPress={() => selectBatch(draft, item)} disabled={props.submitting}>
                            <Text style={[styles.batchChoiceName, selected && styles.batchChoiceNameSelected]}>{quantityLabel(item)}</Text>
                            <Text style={styles.batchChoiceDate}>~ {item.consumeByDate}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : <Text style={styles.unavailable}>이름이 일치하는 활성 재고가 없어 자동 차감하지 않아요.</Text>}

                  {draft.batchId ? (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>{selectedInventory?.unitType === "CUSTOM" ? "사용 후 남은 수량" : "사용량"}</Text>
                      <TextInput
                        style={[styles.amountInput, draft.included && !isValid && styles.amountInputError]}
                        value={draft.value}
                        onChangeText={(value) => updateDraft(draft.key, { value })}
                        editable={!props.submitting}
                        keyboardType={selectedInventory?.unitType === "CUSTOM" ? "default" : "decimal-pad"}
                        placeholder={selectedInventory?.unitType === "CUSTOM" ? "예: 반 봉지" : "0"}
                        placeholderTextColor={Colors.subText}
                      />
                      <Text style={styles.amountUnit}>{selectedInventory?.unitType === "CUSTOM" ? "" : selectedInventory?.unit || draft.ingredient.unit}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
            {!props.loading && selectedCount === 0 ? <Text style={styles.help}>차감할 재료를 하나 이상 선택해 주세요.</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.confirm, (!valid || props.submitting) && styles.disabled]} onPress={props.onConfirm} disabled={!valid || props.submitting}>
              {props.submitting ? <ActivityIndicator color={Colors.white} /> : <MaterialCommunityIcons name="check-circle-outline" size={21} color={Colors.white} />}
              <Text style={styles.confirmText}>{props.submitting ? "식사와 재고 반영 중" : `${selectedCount}개 재료 차감하고 완료`}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(34,34,34,0.42)" },
  sheet: { maxHeight: "92%", minHeight: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.background },
  handle: { width: 40, height: 4, marginTop: 9, marginBottom: 8, alignSelf: "center", borderRadius: 2, backgroundColor: Colors.line },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: "row", gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  description: { marginTop: 5, fontSize: 12, lineHeight: 18, color: Colors.subText },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 11 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  item: { padding: 15, borderWidth: 1, borderColor: Colors.line, borderRadius: 16, backgroundColor: Colors.white },
  itemSelected: { borderColor: Colors.main, backgroundColor: Colors.lightGreen },
  itemHeading: { flexDirection: "row", alignItems: "center" },
  check: { width: 36, minHeight: 40, alignItems: "flex-start", justifyContent: "center" },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  recipeAmount: { marginTop: 3, fontSize: 11, color: Colors.subText },
  batchList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  batchChoice: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: Colors.line, borderRadius: 11, backgroundColor: Colors.softBackground },
  batchChoiceSelected: { borderColor: Colors.mainStrong, backgroundColor: Colors.white },
  batchChoiceName: { fontSize: 12, fontWeight: "600", color: Colors.text },
  batchChoiceNameSelected: { color: Colors.mainStrong },
  batchChoiceDate: { marginTop: 2, fontSize: 10, color: Colors.subText },
  unavailable: { marginTop: 10, fontSize: 12, lineHeight: 18, color: Colors.coralDark },
  amountRow: { minHeight: 46, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  amountLabel: { width: 82, fontSize: 12, fontWeight: "700", color: Colors.subText },
  amountInput: { flex: 1, minWidth: 0, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.line, borderRadius: 11, backgroundColor: Colors.white, fontSize: 16, color: Colors.text },
  amountInputError: { borderColor: Colors.coralDark, backgroundColor: Colors.lightCoral },
  amountUnit: { minWidth: 24, fontSize: 12, fontWeight: "700", color: Colors.mainStrong },
  error: { fontSize: 13, lineHeight: 19, color: Colors.coralDark, textAlign: "center" },
  help: { fontSize: 12, lineHeight: 18, color: Colors.subText, textAlign: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  confirm: { minHeight: 54, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: Colors.mainStrong },
  confirmText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  disabled: { opacity: 0.48 },
});
