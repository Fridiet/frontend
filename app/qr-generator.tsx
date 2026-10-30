import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { generateContainerQr } from "../api/containerApi";
import { ContainerRegistrationForm } from "../components/ContainerRegistrationForm";
import { Colors } from "../constants/colors";
import { useFridge } from "../contexts/FridgeContext";
import { useQrRegistration } from "../hooks/useQrRegistration";
import { qrGeneratorStyles as styles } from "../styles/qrGeneratorStyles";
import { getApiErrorMessage } from "../utils/apiError";
import { createQrImage, type QrImageAsset } from "../utils/qrImage";

export default function QrGeneratorScreen() {
  const router = useRouter();
  const { currentFridge, loading: fridgeLoading } = useFridge();
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [image, setImage] = useState<QrImageAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const exportLock = useRef(false);
  const mounted = useRef(false);
  const registration = useQrRegistration(token, currentFridge, exportLock);

  const newToken = useCallback(() => {
    if (exportLock.current) return;
    try {
      setLoading(true);
      setError(null);
      setToken(Crypto.randomUUID());
    } catch {
      setLoading(false);
      setError("QR 식별자를 만들 수 없어요. 웹에서는 localhost 또는 HTTPS로 접속해 주세요.");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    newToken();
    return () => { mounted.current = false; };
  }, [newToken]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let active = true;
    let ownedImage: QrImageAsset | null = null;
    setLoading(true);
    setError(null);
    setImage(null);
    setImageFailed(false);
    void (async () => {
      try {
        const bytes = await generateContainerQr(token, controller.signal);
        if (!active) return;
        ownedImage = createQrImage(bytes, token);
        setImage(ownedImage);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "QR을 만들지 못했어요. 다시 시도해 주세요."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      ownedImage?.dispose();
    };
  }, [token, attempt]);

  const retry = () => {
    if (loading || exportLock.current) return;
    if (token) {
      setLoading(true);
      setAttempt((value) => value + 1);
    } else newToken();
  };

  const exportImage = async () => {
    if (!image || loading || imageFailed || exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setError(null);
    try {
      await image.exportImage();
    } catch (exportError) {
      if (mounted.current) setError(getApiErrorMessage(exportError, "QR 파일을 저장·공유하지 못했어요. 다시 시도해 주세요."));
    } finally {
      exportLock.current = false;
      if (mounted.current) setExporting(false);
    }
  };

  const busy = loading || exporting || registrationBusy;
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>QR 만들기</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>용기에 붙일 QR을 만들어요</Text>
        <Text style={styles.description}>QR을 저장하거나 출력해 용기에 붙이세요.{"\n"}아래에서 바로 재료를 연결하거나, 나중에 앱에서 스캔해 연결할 수 있어요.</Text>

        <View style={styles.qrPanel}>
          <View style={styles.qrFrame}>
            {loading ? <View style={styles.placeholder}><ActivityIndicator size="large" color={Colors.mainStrong} /><Text style={styles.placeholderText}>QR을 만들고 있어요.</Text></View>
              : image && !imageFailed ? <Image source={{ uri: image.uri }} style={styles.qrImage} contentFit="contain" accessibilityLabel="용기 등록용 QR 코드" onError={() => { setImageFailed(true); setError("QR 이미지를 표시하지 못했어요. 같은 QR로 다시 시도해 주세요."); }} />
                : <View style={styles.placeholder}><MaterialCommunityIcons name="qrcode" size={54} color={Colors.mainStrong} /><Text style={styles.placeholderText}>QR 생성 후 여기에 표시돼요.</Text></View>}
          </View>
          {token ? <Text style={styles.token} selectable>{token}</Text> : null}
        </View>

        {error ? <View style={styles.errorBox} accessibilityRole="alert"><Text style={styles.errorText}>{error}</Text></View> : null}
        {!loading && (!image || imageFailed) ? <Pressable style={styles.secondaryButton} onPress={retry} disabled={busy} accessibilityRole="button"><Text style={styles.secondaryText}>같은 QR로 다시 시도</Text></Pressable> : null}

        <Pressable style={[styles.primaryButton, (!image || imageFailed || busy) && styles.disabled]} onPress={() => void exportImage()} disabled={!image || imageFailed || busy} accessibilityRole="button" accessibilityState={{ disabled: !image || imageFailed || busy, busy: exporting }}>
          {exporting ? <ActivityIndicator color={Colors.white} /> : <MaterialCommunityIcons name={Platform.OS === "web" ? "download" : "share-variant-outline"} size={21} color={Colors.white} />}
          <Text style={styles.primaryText}>{exporting ? "파일 준비 중" : Platform.OS === "web" ? "PNG 다운로드" : "QR 저장·공유"}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, busy && styles.disabled]} onPress={() => { if (!busy && !exportLock.current) newToken(); }} disabled={busy} accessibilityRole="button"><MaterialCommunityIcons name="refresh" size={20} color={Colors.mainStrong} /><Text style={styles.secondaryText}>새 QR 만들기</Text></Pressable>
        <View style={styles.connectionSection}>
          <Text style={styles.sectionTitle}>{registration.container ? "등록된 용기" : "재료 연결 (선택)"}</Text>
          {registration.container ? (
            <View style={styles.connectionSummary} accessibilityLiveRegion="polite">
              <View style={styles.summaryHeading}>
                <MaterialCommunityIcons name="check-circle-outline" size={23} color={Colors.mainStrong} />
                <Text style={styles.summaryTitle}>{registration.container.containerName}</Text>
              </View>
              <Text style={styles.bodyText}>{registration.container.ingredientName ?? "연결된 재료가 없는 용기예요."}</Text>
              {registration.container.ingredientName ? <Text style={styles.bodyText}>
                {registration.container.unitType === "CUSTOM"
                  ? registration.container.customQuantityText || "수량 미정"
                  : registration.container.remainingQuantity === null ? "수량 미정"
                    : `${registration.container.remainingQuantity}${registration.container.unit ?? (registration.container.unitType === "PERCENT" ? "%" : "")}`}
                {" · 소비기한 "}{registration.container.consumeByDate ?? "미입력"}
              </Text> : null}
              <Text style={styles.bodyText}>이 QR을 저장하고 앱에서 스캔하면 등록된 정보를 확인할 수 있어요.</Text>
            </View>
          ) : <>
            <Text style={styles.sectionDescription}>QR만 먼저 저장해도 괜찮아요. 지금 연결하면 재고의 현재 잔량까지 함께 확인할 수 있어요.</Text>
            {fridgeLoading ? <Text style={styles.bodyText}>냉장고 정보를 확인하고 있어요.</Text>
              : !currentFridge ? <Text style={styles.bodyText}>선택된 냉장고가 없어요. 냉장고 화면에서 먼저 선택해 주세요.</Text>
                : <>
                  <Text style={styles.fridgeName}>현재 냉장고: {currentFridge.fridgeName}</Text>
                  {token ? <ContainerRegistrationForm token={token} fridge={currentFridge} inventories={registration.inventories} inventoryLoading={registration.inventoryLoading} inventoryError={registration.inventoryError} retryInventories={registration.retryInventories} disabled={busy} onSubmittingChange={setRegistrationBusy} onRegistered={registration.acceptRegistration} /> : null}
                </>}
          </>}
        </View>
        <Text style={styles.notice}>QR 생성·저장만으로 용기나 재료가 등록되지는 않아요. 새 QR을 만들어도 이전 QR과 연결 정보는 유지돼요.</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
