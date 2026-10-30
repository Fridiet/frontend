import { formatDateInput, isValidDateInput } from "../../utils/dateInput";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import { createInventory } from "../../api/inventoryApi";
import { QuantitySelector } from "../../components/QuantitySelector";
import { Colors } from "../../constants/colors";
import { useFridge } from "../../contexts/FridgeContext";
import type { StorageType } from "../../types/fridge";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  quantityDraftText,
  toQuantityPayload,
  validateQuantityDraft,
  type QuantityDraft,
} from "../../utils/inventoryQuantity";
import { addIngredientStyles as styles } from "../../styles/appStyles";


const storageOptions: { key: StorageType; label: string }[] = [
  { key: "refrigerated", label: "냉장" },
  { key: "frozen", label: "냉동" },
  { key: "room_temperature", label: "상온" },
  { key: "seasoning", label: "조미료" },
];


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

export default function AddIngredientScreen() {
  const router = useRouter();
  const { currentFridge, loading: fridgeLoading } = useFridge();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptSheetVisible, setReceiptSheetVisible] = useState(false);

  const [name, setName] = useState("");
  const [storage, setStorage] = useState<StorageType>("refrigerated");
  const [expiryDate, setExpiryDate] = useState("");

  const [quantity, setQuantity] = useState<QuantityDraft>({
    mode: "count",
    count: 1,
    unit: "개",
    percent: 100,
    customText: "",
  });

  const isValid =
    !!currentFridge &&
    !!name.trim() &&
    !!quantityDraftText(quantity) &&
    validateQuantityDraft(quantity) &&
    !!isValidDateInput(expiryDate.trim());

  const handleAdd = async () => {
    if (!isValid || isSubmitting) return;

    if (!validateQuantityDraft(quantity)) {
      Alert.alert(
        "수량 확인",
        "직접 입력은 '반 통', '조금'처럼 1~40자로 입력해 주세요.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      if (!currentFridge) {
        Alert.alert("냉장고 확인", "재료를 넣을 냉장고를 선택해 주세요.");
        return;
      }

      await createInventory({
        fridgeId: currentFridge.fridgeId,
        ingredientName: name.trim(),
        ...toQuantityPayload(quantity),
        consumeByDate: expiryDate.trim(),
        locationCategory:
          storage === "room_temperature"
            ? "ROOM_TEMP"
            : storage.toUpperCase(),
      });

      Alert.alert("추가 완료", "재료가 냉장고에 추가되었습니다.", [
        {
          text: "확인",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "추가 실패",
        getApiErrorMessage(error, "재료를 추가하지 못했습니다."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceiptPicker = () => {
    if (!currentFridge) {
      Alert.alert("냉장고 확인", "영수증 재료를 넣을 냉장고가 없습니다.");
      return;
    }

    setReceiptSheetVisible(true);
  };

  const handleReceiptImage = async (source: "camera" | "library") => {
    setReceiptSheetVisible(false);

    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          source === "camera"
            ? "카메라 권한이 필요해요"
            : "사진 접근 권한이 필요해요",
          source === "camera"
            ? "영수증을 촬영하려면 설정에서 카메라 권한을 허용해 주세요."
            : "영수증 사진을 선택하려면 설정에서 사진 접근 권한을 허용해 주세요.",
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              cameraType: ImagePicker.CameraType.back,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsMultipleSelection: false,
              quality: 0.85,
            });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      router.push({
        pathname: "/(tabs)/receipt/review",
        params: {
          uri: asset.uri,
          fileName: asset.fileName || `receipt-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        },
      });
    } catch (error) {
      Alert.alert(
        "이미지를 열지 못했어요",
        getApiErrorMessage(error, "잠시 후 다시 시도해 주세요."),
      );
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable style={styles.headerSide} onPress={() => router.back()}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={32}
                color={Colors.text}
              />
            </Pressable>

            <Text style={styles.title}>재료 추가</Text>
            <View style={styles.headerSide} />
          </View>

          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Text style={styles.label}>재료명</Text>
              <TextInput
                style={styles.input}
                placeholder="재료명을 입력해 주세요"
                placeholderTextColor={Colors.subText}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>수량</Text>
              <QuantitySelector value={quantity} onChange={setQuantity} disabled={isSubmitting} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>보관 위치</Text>

              <View style={styles.row}>
                {storageOptions.map((item) => (
                  <Choice
                    key={item.key}
                    label={item.label}
                    selected={storage === item.key}
                    onPress={() => setStorage(item.key)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>소비기한</Text>

              <View style={styles.dateBox}>
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={21}
                  color={Colors.subText}
                />

                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.subText}
                  keyboardType="number-pad"
                  accessibilityLabel="소비기한 (연월일 숫자 8자리)"
                  maxLength={10}
                  value={expiryDate}
                  onChangeText={(value) => setExpiryDate(formatDateInput(value))}
                />
              </View>
              {expiryDate.length > 0 && !isValidDateInput(expiryDate) ? <Text style={{ color: Colors.coralDark, marginTop: 6 }}>올바른 날짜를 입력해 주세요. 예: 2026-09-13</Text> : null}
            </View>

            <Pressable style={styles.receipt} onPress={openReceiptPicker}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={25}
                color={Colors.orange}
              />

              <View style={styles.receiptText}>
                <Text style={styles.receiptTitle}>영수증으로 입력</Text>
                <Text style={styles.subText}>
                  촬영하거나 사진을 골라 여러 재료를 한 번에 추가할 수 있어요
                </Text>
              </View>

              <MaterialCommunityIcons
                name="camera-outline"
                size={23}
                color={Colors.main}
              />
            </Pressable>
          </ScrollView>

          <View style={styles.bottom}>
            <Pressable
              style={[
                styles.addButton,
                (!isValid || isSubmitting || fridgeLoading) && styles.disabled,
              ]}
              disabled={!isValid || isSubmitting || fridgeLoading}
              onPress={handleAdd}
            >
              <Text
                style={[
                  styles.addText,
                  (!isValid || isSubmitting) && { color: Colors.subText },
                ]}
              >
                {fridgeLoading
                  ? "냉장고 확인 중..."
                  : isSubmitting
                    ? "추가 중..."
                    : "재료 추가"}
              </Text>
            </Pressable>
          </View>

          <Modal
            visible={receiptSheetVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setReceiptSheetVisible(false)}
          >
            <View style={styles.receiptSheetOverlay}>
              <Pressable
                style={styles.receiptSheetBackdrop}
                onPress={() => setReceiptSheetVisible(false)}
                accessibilityLabel="영수증 이미지 선택 닫기"
              />
              <View style={styles.receiptSheet}>
                <View style={styles.receiptSheetHandle} />
                <Text style={styles.receiptSheetTitle}>영수증 이미지 추가</Text>
                <Text style={styles.receiptSheetDescription}>
                  글자가 선명하게 보이는 영수증을 선택해 주세요.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.receiptSourceButton,
                    pressed && styles.receiptSourceButtonPressed,
                  ]}
                  onPress={() => void handleReceiptImage("camera")}
                >
                  <View style={styles.receiptSourceIcon}>
                    <MaterialCommunityIcons
                      name="camera-outline"
                      size={24}
                      color={Colors.mainDark}
                    />
                  </View>
                  <View style={styles.receiptSourceText}>
                    <Text style={styles.receiptSourceTitle}>카메라로 촬영</Text>
                    <Text style={styles.receiptSourceDescription}>
                      지금 영수증을 촬영해 분석해요
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.subText}
                  />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.receiptSourceButton,
                    pressed && styles.receiptSourceButtonPressed,
                  ]}
                  onPress={() => void handleReceiptImage("library")}
                >
                  <View style={styles.receiptSourceIcon}>
                    <MaterialCommunityIcons
                      name="image-outline"
                      size={24}
                      color={Colors.mainDark}
                    />
                  </View>
                  <View style={styles.receiptSourceText}>
                    <Text style={styles.receiptSourceTitle}>갤러리에서 선택</Text>
                    <Text style={styles.receiptSourceDescription}>
                      저장된 영수증 사진을 불러와요
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.subText}
                  />
                </Pressable>

                <Pressable
                  style={styles.receiptSheetCancel}
                  onPress={() => setReceiptSheetVisible(false)}
                >
                  <Text style={styles.receiptSheetCancelText}>취소</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
