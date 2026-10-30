import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resetPasswordWithToken, sendRecoveryCode, verifyRecoveryCode } from "../api/accountRecoveryApi";
import { Colors } from "../constants/colors";
import { Features } from "../constants/features";
import { getApiErrorMessage } from "../utils/apiError";

type Step = "email" | "code" | "password" | "done";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountRecoveryScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const validation = useMemo(() => {
    if (step === "email") return emailPattern.test(email.trim()) ? null : "올바른 이메일 주소를 입력해 주세요.";
    if (step === "code") return /^\d{6}$/.test(code) ? null : "인증번호 6자리를 입력해 주세요.";
    if (step === "password") return password.length < 8 ? "비밀번호는 8자 이상이어야 해요." : password !== confirmPassword ? "비밀번호가 일치하지 않아요." : null;
    return null;
  }, [code, confirmPassword, email, password, step]);

  const unavailable = !Features.accountRecovery;
  const send = async () => {
    if (unavailable || validation || busy) return;
    setBusy(true); setError(null);
    try { await sendRecoveryCode(email.trim()); setStep("code"); setSeconds(60); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "인증번호를 보내지 못했어요.")); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    if (unavailable || validation || busy) return;
    setBusy(true); setError(null);
    try { setResetToken(await verifyRecoveryCode(email.trim(), code)); setStep("password"); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "인증번호가 만료되었거나 올바르지 않아요.")); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    if (unavailable || validation || busy || !resetToken) return;
    setBusy(true); setError(null);
    try { await resetPasswordWithToken(resetToken, password); setStep("done"); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "비밀번호를 변경하지 못했어요.")); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (seconds > 0 || unavailable || busy) return;
    setBusy(true); setError(null);
    try { await sendRecoveryCode(email.trim()); setSeconds(60); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "인증번호를 다시 보내지 못했어요.")); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.header}><Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기"><MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} /></Pressable><Text style={styles.headerTitle}>계정 찾기</Text><View style={styles.iconButton} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>이메일 확인 · 비밀번호 재설정</Text><Text style={styles.description}>가입한 이메일로 인증한 뒤 새 비밀번호를 설정할 수 있어요.</Text>
      <View style={styles.steps}>{["이메일", "인증", "재설정"].map((label, index) => { const active = Math.min(["email", "code", "password", "done"].indexOf(step), 2) >= index; return <View key={label} style={styles.stepItem}><View style={[styles.stepDot, active && styles.stepDotActive]}><Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text></View><Text style={styles.stepLabel}>{label}</Text></View>; })}</View>
      {unavailable ? <View style={styles.notice}><MaterialCommunityIcons name="information-outline" size={21} color={Colors.orangeDark} /><Text style={styles.noticeText}>현재 비밀번호 재설정을 이용할 수 없습니다. 고객센터로 문의해 주세요.</Text></View> : null}
      {step === "email" ? <><Text style={styles.label}>가입 이메일</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="example@email.com" placeholderTextColor={Colors.subText} /><Pressable style={[styles.primary, (unavailable || !!validation || busy) && styles.disabled]} disabled={unavailable || !!validation || busy} onPress={() => void send()}>{busy ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>인증번호 받기</Text>}</Pressable></> : null}
      {step === "code" ? <><Text style={styles.email}>{email}</Text><Text style={styles.label}>인증번호 6자리</Text><TextInput style={styles.input} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={Colors.subText} /><Pressable style={[styles.primary, (!!validation || busy) && styles.disabled]} disabled={!!validation || busy} onPress={() => void verify()}><Text style={styles.primaryText}>인증번호 확인</Text></Pressable><Pressable style={styles.link} disabled={seconds > 0 || busy} onPress={() => void resend()}><Text style={[styles.linkText, seconds > 0 && styles.muted]}>{seconds > 0 ? `${seconds}초 후 재전송` : "인증번호 다시 받기"}</Text></Pressable></> : null}
      {step === "password" ? <><Text style={styles.label}>새 비밀번호</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="8자 이상" placeholderTextColor={Colors.subText} /><Text style={styles.label}>새 비밀번호 확인</Text><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="한 번 더 입력" placeholderTextColor={Colors.subText} /><Pressable style={[styles.primary, (!!validation || busy) && styles.disabled]} disabled={!!validation || busy} onPress={() => void reset()}><Text style={styles.primaryText}>비밀번호 변경</Text></Pressable></> : null}
      {step === "done" ? <View style={styles.done}><MaterialCommunityIcons name="check-circle-outline" size={54} color={Colors.mainStrong} /><Text style={styles.doneTitle}>비밀번호가 변경됐어요</Text><Text style={styles.description}>새 비밀번호로 로그인해 주세요.</Text><Pressable style={styles.primary} onPress={() => router.replace("/login")}><Text style={styles.primaryText}>로그인으로 돌아가기</Text></Pressable></View> : null}
      {step !== "done" && validation && (email || code || password || confirmPassword) ? <Text style={styles.validation}>{validation}</Text> : null}{error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: Colors.background }, header: { height: 58, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text }, content: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }, title: { fontSize: 26, lineHeight: 34, fontWeight: "700", color: Colors.text }, description: { marginTop: 8, fontSize: 14, lineHeight: 21, color: Colors.subText }, steps: { marginVertical: 26, flexDirection: "row", justifyContent: "space-around" }, stepItem: { alignItems: "center", gap: 6 }, stepDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: Colors.line }, stepDotActive: { backgroundColor: Colors.mainStrong }, stepNumber: { fontSize: 13, fontWeight: "700", color: Colors.subText }, stepNumberActive: { color: Colors.white }, stepLabel: { fontSize: 12, color: Colors.subText }, notice: { padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 14, backgroundColor: Colors.lightOrange }, noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: Colors.orangeDark }, label: { marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: "700", color: Colors.text }, input: { height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.white, fontSize: 16, color: Colors.text }, primary: { minHeight: 52, marginTop: 22, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: Colors.mainStrong }, primaryText: { fontSize: 15, fontWeight: "700", color: Colors.white }, disabled: { opacity: 0.45 }, email: { marginTop: 8, fontSize: 14, fontWeight: "700", color: Colors.mainStrong }, link: { minHeight: 48, alignItems: "center", justifyContent: "center" }, linkText: { fontSize: 13, fontWeight: "700", color: Colors.mainStrong }, muted: { color: Colors.subText }, validation: { marginTop: 10, fontSize: 13, color: Colors.coralDark }, error: { marginTop: 10, fontSize: 13, lineHeight: 19, color: Colors.coralDark }, done: { marginTop: 30, alignItems: "center" }, doneTitle: { marginTop: 14, fontSize: 22, fontWeight: "700", color: Colors.text },
});
