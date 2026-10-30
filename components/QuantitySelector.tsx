import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors } from "../constants/colors";
import {
  quantityModes,
  type QuantityDraft,
  type QuantityMode,
} from "../utils/inventoryQuantity";

type Props = {
  value: QuantityDraft;
  onChange: (value: QuantityDraft) => void;
  disabled?: boolean;
};

export function QuantitySelector({ value, onChange, disabled = false }: Props) {
  const [countInput, setCountInput] = useState<{ text: string; count: number } | null>(null);
  const countText = countInput && Object.is(countInput.count, value.count)
    ? countInput.text : Number.isFinite(value.count) ? String(value.count) : "";
  const update = (patch: Partial<QuantityDraft>) => onChange({ ...value, ...patch });
  const changeCount = (text: string) => {
    if (!/^\d*\.?\d*$/.test(text)) return;
    const count = text === "" || text === "." ? 0 : Number(text);
    setCountInput({ text, count });
    update({ count });
  };
  const stepCount = (step: number) => {
    setCountInput(null);
    update({ count: Math.max(0, Number(((Number.isFinite(value.count) ? value.count : 0) + step).toFixed(6))) });
  };

  return (
    <View style={styles.root}>
      <View style={styles.choiceRow}>
        {quantityModes.map((mode) => {
          const selected = value.mode === mode.key;
          return (
            <Pressable
              key={mode.key}
              style={[styles.choice, selected && styles.choiceSelected]}
              onPress={() => { setCountInput(null); update({ mode: mode.key as QuantityMode }); }}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.mode === "count" ? (
        <>
          <View style={styles.choiceRow}>
            {["개", "g", "mL"].map((unit) => <Pressable key={unit}
              style={[styles.choice, value.unit === unit && styles.choiceSelected]}
              onPress={() => { if (unit !== value.unit) update({ unit, countBasis: null, perCountQuantity: null, perCountUnit: null }); }}
              disabled={disabled} accessibilityRole="radio"
              accessibilityLabel={`수량 단위 ${unit}`}
              accessibilityState={{ checked: value.unit === unit, disabled }}>
              <Text style={[styles.choiceText, value.unit === unit && styles.choiceTextSelected]}>{unit}</Text>
            </Pressable>)}
          </View>
          <View style={styles.counter}>
            <Pressable
              style={styles.counterButton}
              onPress={() => stepCount(-1)}
              disabled={disabled || value.count <= 0}
              accessibilityLabel="수량 1 줄이기"
            >
              <MaterialCommunityIcons name="minus" size={22} color={Colors.text} />
            </Pressable>
            <TextInput
              style={styles.count}
              value={countText}
              onChangeText={changeCount}
              onBlur={() => setCountInput(null)}
              editable={!disabled}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={16}
              accessibilityLabel="수량 직접 입력"
              placeholder="수량"
              placeholderTextColor={Colors.subText}
            />
            <Pressable
              style={styles.counterButton}
              onPress={() => stepCount(1)}
              disabled={disabled}
              accessibilityLabel="수량 1 늘리기"
            >
              <MaterialCommunityIcons name="plus" size={22} color={Colors.text} />
            </Pressable>
          </View>
          <Text style={styles.countHint}>숫자를 눌러 직접 입력하거나 ＋·－ 버튼으로 조절하세요</Text>
          {(!Number.isFinite(value.count) || value.count <= 0 || value.count >= 1e12) ? (
            <Text style={styles.countError}>수량은 0보다 크고 1조 미만인 숫자로 입력해 주세요.</Text>
          ) : null}
        </>
      ) : null}

      {value.mode === "percent" ? (
        <View style={styles.percentBox}>
          <View style={styles.percentHeader}>
            <Text style={styles.percentLabel}>현재 남은 양</Text>
            <Text style={styles.percentValue}>{value.percent}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={value.percent}
            onValueChange={(percent) => update({ percent })}
            disabled={disabled}
            minimumTrackTintColor={Colors.main}
            maximumTrackTintColor={Colors.line}
            thumbTintColor={Colors.main}
          />
          <View style={styles.percentRange}>
            <Text style={styles.percentRangeText}>1%</Text>
            <Text style={styles.percentRangeText}>100%</Text>
          </View>
        </View>
      ) : null}

      {value.mode === "custom" ? (
        <TextInput
          style={styles.input}
          value={value.customText}
          onChangeText={(customText) => update({ customText })}
          editable={!disabled}
          maxLength={40}
          placeholder="예: 반 통, 조금, 300g, 1/2통"
          placeholderTextColor={Colors.subText}
          accessibilityLabel="직접 입력 수량"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 9 },
  choiceRow: { flexDirection: "row", gap: 7 },
  choice: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 11,
    backgroundColor: Colors.white,
  },
  choiceSelected: { borderColor: Colors.main, backgroundColor: Colors.lightGreen },
  choiceText: { fontSize: 12, fontWeight: "600", color: Colors.subText },
  choiceTextSelected: { color: Colors.mainDark, fontWeight: "700" },
  counter: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  counterButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.lightGreen,
  },
  count: { flex: 1, minWidth: 40, minHeight: 48, paddingVertical: 8, textAlign: "center", fontSize: 19, fontWeight: "700", color: Colors.text },
  countError: { fontSize: 12, lineHeight: 18, color: Colors.coralDark },
  countHint: { fontSize: 12, lineHeight: 18, color: Colors.subText },
  percentBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  percentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  percentLabel: { fontSize: 12, color: Colors.subText },
  percentValue: { fontSize: 18, fontWeight: "700", color: Colors.mainDark },
  slider: { width: "100%", height: 40 },
  percentRange: { flexDirection: "row", justifyContent: "space-between" },
  percentRangeText: { fontSize: 10, color: Colors.subText },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    backgroundColor: Colors.white,
    color: Colors.text,
    fontSize: 16,
  },
});

