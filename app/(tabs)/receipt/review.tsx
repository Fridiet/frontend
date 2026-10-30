import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { addOcrIngredients, createInventory, OcrInventoryCreatePayload } from "../../../api/inventoryApi";
import {
  analyzeReceipt,
  type ReceiptDraftItem,
} from "../../../api/receiptApi";
import { Colors } from "../../../constants/colors";
import { useFridge } from "../../../contexts/FridgeContext";
import { getApiErrorMessage } from "../../../utils/apiError";
import { receiptReviewStyles as styles } from "../../../styles/appStyles";
import { UnitType } from "@/types/fridge";


type DraftStatus = "pending" | "success" | "error";
type EditableDraft = ReceiptDraftItem & {
  selected: boolean;
  status: DraftStatus;
  error?: string;
};

const storageOptions = [
  { key: "REFRIGERATED", label: "냉장" },
  { key: "FROZEN", label: "냉동" },
  { key: "ROOM_TEMP", label: "상온" },
  { key: "SEASONING", label: "조미료" },
];

function oneParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ReceiptReviewScreen() {
  const params = useLocalSearchParams<{
    uri?: string | string[];
    fileName?: string | string[];
    mimeType?: string | string[];
  }>();
  const { currentFridge } = useFridge();
  const uri = oneParam(params.uri);
  const fileName = oneParam(params.fileName) || "receipt.jpg";
  const mimeType = oneParam(params.mimeType) || "image/jpeg";

  const [items, setItems] = useState<EditableDraft[]>([]);
  const [analyzing, setAnalyzing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!uri) {
      setAnalysisError("촬영한 영수증을 찾을 수 없습니다.");
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const drafts = await analyzeReceipt({ uri, fileName, mimeType });
      setItems(
        drafts.map((item) => ({
          ...item,
          selected: !item.requiresManualEntry,
          status: "pending",
        })),
      );
      if (drafts.length === 0) {
        setAnalysisError("영수증에서 등록할 재료를 찾지 못했습니다.");
      }
    } catch (error) {
      setAnalysisError(
        getApiErrorMessage(error, "영수증을 분석하지 못했습니다."),
      );
    } finally {
      setAnalyzing(false);
    }
  }, [fileName, mimeType, uri]);

  useEffect(() => {
    void analyze();
  }, [analyze]);

  const pendingSelected = useMemo(
    () => items.filter((item) => item.selected && item.status !== "success"),
    [items],
  );

  const updateItem = (id: string, patch: Partial<EditableDraft>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const validateItem = (item: EditableDraft) => {
    if (!item.name.trim()) return "재료명을 입력해 주세요.";
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "수량을 0보다 큰 숫자로 입력해 주세요.";
    }
    if (!item.unit.trim()) return "단위를 입력해 주세요.";
    if (!storageOptions.some((option) => option.key === item.locationCategory)) {
      return "보관 위치를 확인하고 선택해 주세요.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.consumeByDate.trim())) {
      return "소비기한을 YYYY-MM-DD 형식으로 입력해 주세요.";
    }
    const parsedDate = new Date(`${item.consumeByDate.trim()}T00:00:00Z`);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== item.consumeByDate.trim()) {
      return "실제로 존재하는 소비기한 날짜를 입력해 주세요.";
    }
    return null;
  };

  const handleOcrRegister = async() => {
    if(!currentFridge?.fridgeId || pendingSelected.length === 0) return;

    const itemsPayload = pendingSelected.map((item) => ({
      ingredientName: item.name.trim(),
      unitType: "QUANTITY" as UnitType,
      unit: item.unit.trim(),
      quantity: Number(item.quantity),
      consumeByDate: item.consumeByDate.trim(),
      locationCategory: item.locationCategory,
    }));

    setSaving(true);
    let failures = 0;

    try {
      await addOcrIngredients(currentFridge.fridgeId, { 
        items: itemsPayload, 
      });

      pendingSelected.forEach((item) => {
        updateItem(item.id, { status: "success", error: undefined });
      });
    } catch(error) {
      failures += pendingSelected.length;

      pendingSelected.forEach((item) => {
        updateItem(item.id, {
          status: "error", 
          error: getApiErrorMessage(error, "등록하지 못했습니다."),
        });
      });
    }
    
    setSaving(false);
    if(failures === 0) {
      Alert.alert("등록 완료", "선택한 재료를 냉장고에 추가했습니다.", [
        {
          text: "냉장고 보기",
          onPress: () => router.replace("/(tabs)/Fridge"),
        },
      ]);
    } else {
      Alert.alert(
        "일부 등록 실패",
        `${failures}개 항목을 등록하지 못했습니다. 실패한 항목만 다시 시도할 수 있어요.`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerSide} onPress={() => router.back()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={32}
              color={Colors.text}
            />
          </Pressable>
          <Text style={styles.headerTitle}>영수증 확인</Text>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {uri ? <Image source={{ uri }} style={styles.receiptImage} /> : null}
          <View style={styles.intro}>
            <Text style={styles.introTitle}>인식한 재료를 확인해 주세요</Text>
            <Text style={styles.introText}>
              소비기한과 보관 위치는 추천값이므로 등록 전에 확인하는 것이 좋아요.
            </Text>
          </View>

          {analyzing ? (
            <StateBox
              loading
              icon="text-recognition"
              title="영수증을 읽고 있어요"
              description="상품명과 수량을 정리하는 중입니다."
            />
          ) : analysisError && items.length === 0 ? (
            <StateBox
              icon="receipt-text-remove-outline"
              title="분석 결과를 만들지 못했어요"
              description={analysisError}
              actionLabel="다시 분석"
              onAction={() => void analyze()}
            />
          ) : (
            <View style={styles.itemList}>
              {items.map((item, index) => (
                <ReceiptItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  disabled={saving || item.status === "success"}
                  onChange={(patch) => updateItem(item.id, patch)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            style={styles.retakeButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.retakeButtonText}>다시 촬영</Text>
          </Pressable>
          <Pressable
            style={[
              styles.registerButton,
              (saving || pendingSelected.length === 0) && styles.disabled,
            ]}
            onPress={handleOcrRegister}
            disabled={saving || pendingSelected.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.registerButtonText}>
                {pendingSelected.length}개 등록
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReceiptItemCard({
  item,
  index,
  disabled,
  onChange,
}: {
  item: EditableDraft;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<EditableDraft>) => void;
}) {
  return (
    <View style={[styles.itemCard, !item.selected && styles.itemCardExcluded]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>재료 {index + 1}</Text>
        {item.status === "success" ? (
          <View style={styles.successBadge}>
            <MaterialCommunityIcons name="check" size={15} color={Colors.mainDark} />
            <Text style={styles.successText}>등록 완료</Text>
          </View>
        ) : (
          <Pressable
            style={styles.selectToggle}
            onPress={() => onChange({ selected: !item.selected })}
            disabled={disabled}
          >
            <MaterialCommunityIcons
              name={item.selected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              color={item.selected ? Colors.main : Colors.subText}
            />
            <Text style={styles.selectText}>
              {item.selected ? "등록" : "제외"}
            </Text>
          </Pressable>
        )}
      </View>

      {item.rawText ? <Text style={{ color: Colors.subText, marginBottom: 8 }}>영수증 원문: {item.rawText}</Text> : null}
      {item.requiresManualEntry ? <Text style={styles.itemError}>미분류 상품 · 식품인지 확인 후 등록을 선택하고 빈 항목을 입력해주세요.</Text> : null}
      {item.reviewNotes?.map((note, index) => (
        <Text key={index} style={{ color: Colors.mainDark, marginBottom: 6 }}>확인: {note}</Text>
      ))}
      <Field label="재료명">
        <TextInput
          style={styles.input}
          value={item.name}
          onChangeText={(name) => onChange({ name, status: "pending", error: undefined })}
          editable={!disabled && item.selected}
          placeholder="재료명"
          placeholderTextColor={Colors.subText}
        />
      </Field>

      <View style={styles.twoColumns}>
        <Field label="수량" style={styles.column}>
          <TextInput
            style={styles.input}
            value={item.quantity}
            onChangeText={(quantity) =>
              onChange({ quantity, status: "pending", error: undefined })
            }
            editable={!disabled && item.selected}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={Colors.subText}
          />
        </Field>
        <Field label="단위" style={styles.column}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["g", "개", "mL"].map((unit) => <Pressable key={unit} disabled={disabled || !item.selected} onPress={() => onChange({ unit, status: "pending", error: undefined })}><Text>{unit}</Text></Pressable>)}
          </View>
          <TextInput
            style={styles.input}
            value={item.unit}
            onChangeText={(unit) => onChange({ unit, status: "pending", error: undefined })}
            editable={!disabled && item.selected}
            placeholder="개"
            placeholderTextColor={Colors.subText}
          />
        </Field>
      </View>

      <Field label="소비기한">
        <TextInput
          style={styles.input}
          value={item.consumeByDate}
          onChangeText={(consumeByDate) =>
            onChange({ consumeByDate, status: "pending", error: undefined })
          }
          editable={!disabled && item.selected}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.subText}
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="보관 위치">
        {item.locationCategory === "UNKNOWN" ? <Text style={styles.itemError}>보관 위치를 판단하지 못했어요. 직접 선택해주세요.</Text> : null}
        <View style={styles.storageRow}>
          {storageOptions.map((option) => {
            const selected = item.locationCategory === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.storageButton, selected && styles.storageButtonSelected]}
                disabled={disabled || !item.selected}
                onPress={() =>
                  onChange({
                    locationCategory: option.key,
                    status: "pending",
                    error: undefined,
                  })
                }
              >
                <Text
                  style={[styles.storageText, selected && styles.storageTextSelected]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {item.error ? <Text style={styles.itemError}>{item.error}</Text> : null}
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function StateBox({
  icon,
  title,
  description,
  loading,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateBox}>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.main} />
      ) : (
        <MaterialCommunityIcons name={icon} size={42} color={Colors.main} />
      )}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.stateAction} onPress={onAction}>
          <Text style={styles.stateActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
