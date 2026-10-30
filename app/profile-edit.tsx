import { updateProfile } from "@/api/userApi";
import { updateSessionProfile } from "@/utils/token";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../constants/colors";
import { Features } from "../constants/features";
import { useSession } from "../hooks/useSession";
import { getApiErrorMessage } from "../utils/apiError";

export default function ProfileEditScreen() {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState(session?.name ?? "");
  const [healthCondition, setHealthCondition] = useState(session?.healthCondition ?? "");
  const [healthGoal, setHealthGoal] = useState(session?.healthGoal ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    const payload = { healthCondition: healthCondition.trim(), healthGoal: healthGoal.trim(), ...(Features.profileNameEdit ? { name: name.trim() } : {}) };
    try {
      const result = await updateProfile(payload);
      await updateSessionProfile({ ...payload, ...(typeof result?.name === "string" ? { name: result.name } : {}) });
      router.back();
    } catch (requestError) { setError(getApiErrorMessage(requestError, "프로필을 저장하지 못했어요.")); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.header}><Pressable style={styles.icon} onPress={() => router.back()} accessibilityLabel="뒤로 가기"><MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} /></Pressable><Text style={styles.headerTitle}>프로필 수정</Text><View style={styles.icon} /></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>이름</Text><TextInput style={[styles.input, !Features.profileNameEdit && styles.readonly]} value={name} onChangeText={setName} editable={Features.profileNameEdit && !saving} maxLength={30} />
      {!Features.profileNameEdit ? <Text style={styles.hint}>이름 변경은 서버 지원 전까지 읽기 전용이에요.</Text> : null}
      <Text style={styles.label}>건강 상태</Text><TextInput style={styles.input} value={healthCondition} onChangeText={setHealthCondition} editable={!saving} placeholder="예: 고혈압 관리 중" placeholderTextColor={Colors.subText} maxLength={100} />
      <Text style={styles.label}>건강 목표</Text><TextInput style={[styles.input, styles.multiline]} value={healthGoal} onChangeText={setHealthGoal} editable={!saving} multiline placeholder="예: 균형 잡힌 식사와 체중 관리" placeholderTextColor={Colors.subText} maxLength={200} />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <Pressable style={[styles.primary, saving && styles.disabled]} disabled={saving} onPress={() => void save()}>{saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>저장</Text>}</Pressable>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: Colors.background }, header: { height: 58, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text }, content: { width: "100%", maxWidth: 580, alignSelf: "center", padding: 22 }, label: { marginTop: 18, marginBottom: 8, fontSize: 13, fontWeight: "700", color: Colors.text }, input: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, backgroundColor: Colors.white, fontSize: 16, color: Colors.text }, readonly: { backgroundColor: Colors.softBackground, color: Colors.subText }, multiline: { height: 110, paddingTop: 14, textAlignVertical: "top" }, hint: { marginTop: 7, fontSize: 12, color: Colors.subText }, error: { marginTop: 14, fontSize: 13, color: Colors.coralDark }, primary: { minHeight: 52, marginTop: 26, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: Colors.mainStrong }, primaryText: { fontSize: 16, fontWeight: "700", color: Colors.white }, disabled: { opacity: 0.5 } });
