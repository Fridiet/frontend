import { prepareQrDeduction } from "../utils/qrQuantity";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, scanFromURLAsync, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deductContainer, scanContainer, type ContainerScanResponse } from "../api/containerApi";
import { ContainerRegistrationForm } from "../components/ContainerRegistrationForm";
import { getInventories } from "../api/inventoryApi";
import { Colors } from "../constants/colors";
import { useFridge } from "../contexts/FridgeContext";
import { featureStyles as styles } from "../styles/featureStyles";
import type { InventoryItem } from "../types/fridge";
import { addInventoryActivity } from "../utils/activityLedger";
import { getApiErrorMessage } from "../utils/apiError";
import { extractQrToken } from "../utils/qr";
import ContainerPhotoEstimate from "../components/ContainerPhotoEstimate";

type ScreenState = "scan" | "loading" | "result";

export default function QrScannerScreen() {
  const router = useRouter();
  const { currentFridge } = useFridge();
  const [permission, requestPermission] = useCameraPermissions();
  const [screenState, setScreenState] = useState<ScreenState>("scan");
  const [scanSource, setScanSource] = useState<"choose" | "camera">("choose");
  const [scannedToken, setScannedToken] = useState("");
  const [container, setContainer] = useState<ContainerScanResponse | null>(null);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [usageValue, setUsageValue] = useState("");
  const [usageMode, setUsageMode] = useState<"used" | "remaining">("used");
  const scanLock = useRef(false);
  const mutationLock = useRef(false);
  const usage = prepareQrDeduction(
    container?.unitType ?? null,
    container?.remainingQuantity ?? null,
    usageValue,
    usageMode,
  );
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  useEffect(() => {
    let active = true;
    const loadInventory = async () => {
      if (!currentFridge) return;
      try {
        const result = await getInventories(currentFridge.fridgeId);
        if (active) setInventories(result);
      } catch {
        if (active) setInventories([]);
      }
    };
    void loadInventory();
    return () => { active = false; };
  }, [currentFridge]);

  const resetScanner = () => {
    setScreenState("scan");
    setScanSource("choose");
    setScannedToken("");
    setContainer(null);
    setUsageValue("");
    setUsageMode("used");
    setError(null);
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (screenState !== "scan" || scanLock.current) return;
    scanLock.current = true;
    const token = extractQrToken(data);
    if (!token) {
      setScreenState("result");
      setScannedToken("");
      setContainer(null);
      setError("유효하지 않은 QR 코드예요. 토큰 정보를 확인해 주세요.");
      scanLock.current = false;
      return;
    }
    setScreenState("loading");
    setScannedToken(token);
    setError(null);
    try {
      setContainer(await scanContainer(token));
    } catch (scanError) {
      setError(getApiErrorMessage(scanError, "QR 정보를 확인하지 못했어요."));
    } finally {
      setScreenState("result");
      scanLock.current = false;
    }
  };

  const openCamera = async () => {
    setError(null);
    const cameraPermission = permission?.granted ? permission : await requestPermission();
    if (!cameraPermission.granted) {
      setError("카메라 권한을 허용하면 용기의 QR을 바로 스캔할 수 있어요.");
      return;
    }
    setScanSource("camera");
  };

  const pickQrFromGallery = async () => {
    setError(null);
    try {
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        setError("갤러리에서 QR 이미지를 선택하려면 사진 접근 권한이 필요해요.");
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (picked.canceled || !picked.assets[0]?.uri) return;
      setScreenState("loading");
      const results = await scanFromURLAsync(picked.assets[0].uri, ["qr"]);
      if (!results.length) {
        setScreenState("scan");
        setScanSource("choose");
        setError("선택한 이미지에서 QR 코드를 찾지 못했어요. QR이 선명하게 보이는 이미지를 선택해 주세요.");
        return;
      }
      setScreenState("scan");
      await handleBarcodeScanned(results[0]);
    } catch (galleryError) {
      setScreenState("scan");
      setScanSource("choose");
      setError(getApiErrorMessage(galleryError, "이미지의 QR 코드를 읽지 못했어요. 다른 이미지를 선택해 주세요."));
    }
  };

  const handleDeduct = async () => {
    if (!container?.unitType || !currentFridge || mutationLock.current) return;
    if (container.quantityNeedsReview) {
      setError("재고 상세 화면에서 현재 잔량을 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    if (usage.error || !usage.payload) {
      setError(usage.error);
      return;
    }
    setMutating(true);
    setError(null);
    const previous = container;
    mutationLock.current = true;
    try {
      const latest = await scanContainer(scannedToken);
      if (latest.isEmpty || latest.batchId !== previous.batchId || latest.remainingQuantity !== previous.remainingQuantity || latest.unitType !== previous.unitType || latest.unit !== previous.unit || latest.customQuantityText !== previous.customQuantityText) {
        setContainer(latest);
        setUsageValue("");
        setError("재고가 변경됐어요. 갱신된 잔량을 확인하고 다시 입력해 주세요.");
        return;
      }
      const next = await deductContainer(scannedToken, usage.payload);
      setContainer(next);
      setUsageValue("");
      try {
        await addInventoryActivity({
          fridgeId: currentFridge.fridgeId,
          ingredientName: previous.ingredientName ?? "이름 없는 재료",
          type: "QR_USE",
          quantity: usage.quantityUsed ?? null,
          unit: previous.unit,
          customText: usage.customText ?? null,
        });
      } catch {
        setError("사용량은 반영됐지만 이 기기의 월말 결산 기록에는 저장하지 못했어요.");
      }
    } catch (deductError) {
      setError(getApiErrorMessage(deductError, "사용량을 반영하지 못했어요."));
    } finally {
      mutationLock.current = false;
      setMutating(false);
    }
  };

  const header = <View style={styles.header}><Pressable style={styles.headerButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기"><MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} /></Pressable><Text style={styles.headerTitle}>용기 QR 스캔</Text><View style={styles.headerButton} /></View>;

  if (!currentFridge) return <SafeAreaView style={styles.safeArea}>{header}<View style={styles.centerState}><Text style={styles.stateTitle}>선택된 냉장고가 없어요</Text><Text style={styles.stateText}>냉장고를 먼저 선택한 뒤 다시 시도해 주세요.</Text></View></SafeAreaView>;

  if (screenState === "scan" && scanSource === "choose") return <SafeAreaView style={styles.safeArea}>{header}
    <View style={styles.sourceContent}>
      <Text style={styles.sourceTitle}>QR을 어떻게 불러올까요?</Text>
      <Text style={styles.sourceDescription}>용기에 붙은 QR을 바로 촬영하거나, 저장해 둔 QR 이미지를 선택할 수 있어요.</Text>
      {error ? <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={Colors.coralDark} /><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.sourceOptions}>
        <Pressable style={styles.sourceOption} onPress={() => void openCamera()} accessibilityRole="button">
          <View style={styles.sourceIcon}><MaterialCommunityIcons name="camera-outline" size={30} color={Colors.mainStrong} /></View>
          <View style={styles.sourceCopy}><Text style={styles.sourceOptionTitle}>카메라로 스캔</Text><Text style={styles.sourceOptionText}>QR을 화면 안에 맞춰 바로 인식해요.</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.subText} />
        </Pressable>
        <Pressable style={styles.sourceOption} onPress={() => void pickQrFromGallery()} accessibilityRole="button">
          <View style={styles.sourceIcon}><MaterialCommunityIcons name="image-outline" size={30} color={Colors.mainStrong} /></View>
          <View style={styles.sourceCopy}><Text style={styles.sourceOptionTitle}>갤러리에서 불러오기</Text><Text style={styles.sourceOptionText}>저장된 QR 이미지를 골라 인식해요.</Text></View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.subText} />
        </Pressable>
      </View>
    </View>
  </SafeAreaView>;

  if (screenState === "scan" && scanSource === "camera") return <SafeAreaView style={styles.cameraSafeArea}>{header}
    <View style={styles.cameraShell}>
      <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleBarcodeScanned} />
      <View pointerEvents="none" style={styles.scanOverlay}><View style={styles.scanFrame} /><Text style={styles.scanGuide}>용기의 QR 코드를 사각형 안에 맞춰 주세요</Text></View>
      <Pressable style={styles.galleryShortcut} onPress={() => { setScanSource("choose"); void pickQrFromGallery(); }} accessibilityRole="button"><MaterialCommunityIcons name="image-outline" size={20} color={Colors.white} /><Text style={styles.galleryShortcutText}>갤러리에서 불러오기</Text></Pressable>
    </View>
  </SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {header}
        <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
          {screenState === "loading" ? <View style={styles.centerState}><ActivityIndicator size="large" color={Colors.main} /><Text style={styles.stateText}>용기 정보를 확인하고 있어요.</Text></View> : <>
            <View style={styles.tokenRow}><MaterialCommunityIcons name="qrcode" size={21} color={Colors.mainStrong} /><Text style={styles.tokenText} numberOfLines={1}>{scannedToken}</Text></View>
            {error ? <View style={styles.errorBox}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={Colors.coralDark} /><Text style={styles.errorText}>{error}</Text></View> : null}
            {container?.containerId ? <ContainerPhotoEstimate key={scannedToken} token={scannedToken} /> : null}
            {container && !container.isEmpty ? <View style={styles.featureSection}>
              <Text style={styles.featureTitle}>{container.containerName}</Text><Text style={styles.featureSubtitle}>{container.ingredientName}</Text>
              <View style={styles.dataRows}><View style={styles.dataRow}><Text style={styles.dataLabel}>현재 잔량</Text><Text style={styles.dataValue}>{container.unitType === "CUSTOM" ? container.customQuantityText || "수량 미정" : `${container.remainingQuantity ?? "-"}${container.unit ?? ""}`}</Text></View><View style={styles.dataRow}><Text style={styles.dataLabel}>소비기한</Text><Text style={styles.dataValue}>{container.consumeByDate ?? "미입력"}</Text></View></View>
              {container.unitType !== "CUSTOM" ? <>
                <View style={styles.dataRow}>{(["used", "remaining"] as const).map(mode => <Pressable key={mode} disabled={mutating} style={styles.secondaryButton} onPress={() => { setUsageMode(mode); setUsageValue(""); }} accessibilityRole="radio" accessibilityState={{ checked: usageMode === mode }}><MaterialCommunityIcons name={usageMode === mode ? "radiobox-marked" : "radiobox-blank"} size={20} color={Colors.mainStrong} /><Text style={styles.secondaryButtonText}>{mode === "used" ? "사용한 양" : "남은 양"}</Text></Pressable>)}</View>
                <View style={styles.dataRow}>{[0.5, 1].map(ratio => <Pressable key={ratio} disabled={mutating || container.remainingQuantity === null} style={styles.secondaryButton} onPress={() => { setUsageMode("used"); setUsageValue(String(Number(((container.remainingQuantity ?? 0) * ratio).toFixed(10)))); }}><Text style={styles.secondaryButtonText}>{ratio === 1 ? "전부 사용" : "반 사용"}</Text></Pressable>)}</View>
              </> : null}
              <Text style={styles.inputLabel}>{container.unitType === "CUSTOM" ? "사용 후 남은 상태" : usageMode === "remaining" ? "사용 후 남은 양" : "이번 사용량"}</Text>
              <View style={styles.inputWithUnit}><TextInput style={styles.flexInput} value={usageValue} editable={!mutating} accessibilityLabel={container.unitType === "CUSTOM" ? "용기 사용 후 남은 상태 입력" : "용기 수량 입력"} onChangeText={setUsageValue} placeholder={container.unitType === "CUSTOM" ? "예: 반 통" : "예: 0.5"} placeholderTextColor={Colors.subText} keyboardType={container.unitType === "CUSTOM" ? "default" : "decimal-pad"} maxLength={40} />{container.unitType !== "CUSTOM" ? <Text style={styles.inputUnit}>{container.unit ?? (container.unitType === "PERCENT" ? "%" : "")}</Text> : null}</View>
              {container.unitType !== "CUSTOM" && usageValue.trim() ? <Text style={styles.stateText}>{usage.error || `사용 ${usage.quantityUsed}${container.unit ?? ""} · 반영 후 ${usage.nextRemaining}${container.unit ?? ""} 남음`}</Text> : null}
              <Pressable style={[styles.primaryButton, mutating && styles.disabled]} onPress={() => void handleDeduct()} disabled={mutating}>{mutating ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>사용량 반영</Text>}</Pressable>
            </View> : container ? <View style={styles.featureSection}>
              <Text style={styles.featureTitle}>{container.containerId ? "현재 비어 있는 용기예요" : "처음 보는 QR 코드예요"}</Text>
              <Text style={styles.featureSubtitle}>새 재료를 바로 등록하거나, 기존 재고에서 일부를 덜어 담을 준비를 할 수 있어요.</Text>
              <ContainerRegistrationForm token={scannedToken} fridge={currentFridge} inventories={inventories.filter((item) => item.status === "ACTIVE" && !item.isConsumed)} disabled={mutating} onSubmittingChange={setMutating} onRegistered={(result) => { setContainer(result); setError(null); }} />
            </View> : null}
            <Pressable style={styles.secondaryButton} disabled={mutating} onPress={resetScanner}><MaterialCommunityIcons name="qrcode-scan" size={20} color={Colors.mainStrong} /><Text style={styles.secondaryButtonText}>다른 QR 스캔</Text></Pressable>
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
