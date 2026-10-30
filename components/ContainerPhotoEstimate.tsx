import { useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { estimateContainer, type ContainerEstimate } from "../api/containerApi";
import { Colors } from "../constants/colors";
import { featureStyles } from "../styles/featureStyles";
import { getApiErrorMessage } from "../utils/apiError";

const bandLabels = {
  empty: "비어 있음", up_to_25: "25% 이하", up_to_50: "25% 초과 ~ 50% 이하",
  up_to_75: "50% 초과 ~ 75% 이하", over_75: "75% 초과", unknown: "판별 불가",
};

export default function ContainerPhotoEstimate({ token }: { token: string }) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [result, setResult] = useState<ContainerEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function pick(camera: boolean) {
    setError("");
    try {
      if (camera && Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError("촬영하려면 카메라 권한을 허용해주세요."); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.9 };
      const selection = camera ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (selection.canceled) return;
      const selected = selection.assets[0];
      if ((selected.fileSize ?? 0) > 10 * 1024 * 1024) {
        setError("사진은 10MB 이하여야 합니다."); return;
      }
      setAsset(selected); setResult(null); setConfirmed(false);
    } catch { setError("사진을 열지 못했습니다. 권한이나 사진 형식을 확인해주세요."); }
  }

  async function analyze() {
    if (!asset || busy) return;
    setBusy(true); setError(""); setResult(null); setConfirmed(false);
    try { setResult(await estimateContainer(token, asset)); }
    catch (e) { setError(getApiErrorMessage(e, "분석에 실패했습니다. 잠시 후 다시 시도해주세요.")); }
    finally { setBusy(false); }
  }

  return <View style={styles.featureSection}>
    <Text style={styles.featureTitle}>사진으로 잔량 확인</Text>
    <Text style={styles.featureSubtitle}>용기 전체와 내용물이 보이게 촬영해주세요. 분석 시 사진이 OpenAI로 전송됩니다. 재고 수량은 자동 변경되지 않습니다.</Text>
    <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => void pick(false)}><Text style={styles.secondaryButtonText}>용기 사진 선택</Text></Pressable>
    <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => void pick(true)}><Text style={styles.secondaryButtonText}>용기 사진 촬영</Text></Pressable>
    {asset && <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" />}
    {asset && <Pressable style={[styles.primaryButton, busy && styles.disabled]} disabled={busy} onPress={() => void analyze()}>
      {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>사진 전송 및 잔량 분석</Text>}
    </Pressable>}
    {busy && <Text style={styles.featureSubtitle}>분석 중입니다. 최대 약 1분이 걸릴 수 있어요.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    {result && <View style={styles.result}>
      <Text style={styles.featureTitle}>{result.status === "estimated" ? `잔량 ${bandLabels[result.remainingBand]}` : "사진만으로 판단하기 어려워요"}</Text>
      {result.status === "estimated" && <Text style={styles.featureSubtitle}>용기를 가득 채웠을 때의 용적 기준으로 나눈 대략적인 구간입니다. 사진 각도에 따라 인접 구간으로 달라질 수 있어요.</Text>}
      {result.status !== "estimated" && <Text style={styles.featureSubtitle}>{result.reason}</Text>}
      <Text style={styles.featureSubtitle}>정확한 측정값이 아닙니다. 처음 담은 양 대비 비율이나 g·mL로 환산할 수 없습니다.</Text>
      {result.status === "estimated" && <Pressable style={styles.primaryButton} onPress={() => setConfirmed(true)} disabled={confirmed}>
        <Text style={styles.primaryButtonText}>{confirmed ? "추정 결과 확인 완료" : "추정 결과 확인"}</Text>
      </Pressable>}
      {confirmed && <Text style={styles.featureSubtitle}>결과를 확인했습니다. 재고 수량은 변경하지 않았습니다.</Text>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  ...featureStyles,
  featureSection: { ...featureStyles.featureSection, gap: 12, marginBottom: 16 },
  featureSubtitle: { ...featureStyles.featureSubtitle, marginTop: 0, marginBottom: 0 },
  secondaryButton: { ...featureStyles.secondaryButton, marginTop: 0 },
  primaryButton: { ...featureStyles.primaryButton, marginTop: 0 },
  errorText: { fontSize: 13, lineHeight: 19, color: Colors.coralDark },
  preview: { width: "100%", height: 240, borderRadius: 12 },
  result: { gap: 12 },
});
