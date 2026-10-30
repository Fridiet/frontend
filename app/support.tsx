import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SettingsScreenHeader from "../components/SettingsScreenHeader";
import { Colors } from "../constants/colors";

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

export default function SupportScreen() {
  const [error, setError] = useState<string | null>(null);
  const available = SUPPORT_EMAIL.length > 0;

  const openEmail = async () => {
    if (!available) return;
    setError(null);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Fridiet 문의")}`;
    try {
      await Linking.openURL(url);
    } catch {
      setError("메일 앱을 열지 못했어요. 기기의 메일 설정을 확인해 주세요.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SettingsScreenHeader title="고객센터" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.supportPanel}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="email-outline" size={31} color={Colors.mainStrong} />
          </View>
          <Text style={styles.title}>도움이 필요하신가요?</Text>
          <Text style={styles.description}>
            Fridiet 이용 중 불편한 점이나 궁금한 내용을 보내주시면 확인 후 답변드릴게요.
          </Text>
          <Pressable
            style={[styles.button, !available && styles.buttonDisabled]}
            onPress={() => void openEmail()}
            disabled={!available}
            accessibilityRole="button"
            accessibilityState={{ disabled: !available }}
            accessibilityLabel={available ? "메일로 문의하기" : "문의 메일 준비 중"}
          >
            <MaterialCommunityIcons
              name={available ? "send-outline" : "clock-outline"}
              size={20}
              color={available ? Colors.white : Colors.subText}
            />
            <Text style={[styles.buttonText, !available && styles.buttonTextDisabled]}>
              {available ? "메일로 문의하기" : "문의 메일 준비 중"}
            </Text>
          </Pressable>
          {available ? <Text style={styles.email}>{SUPPORT_EMAIL}</Text> : null}
        </View>

        {!available ? (
          <View style={styles.readyNote}>
            <MaterialCommunityIcons name="information-outline" size={19} color={Colors.orangeDark} />
            <Text style={styles.readyNoteText}>공용 문의 메일을 준비하고 있어요. 주소가 확정되면 바로 이용할 수 있습니다.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-circle-outline" size={19} color={Colors.coralDark} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  supportPanel: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGreen,
  },
  title: { marginTop: 18, fontSize: 20, fontWeight: "700", color: Colors.text },
  description: {
    maxWidth: 360,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: Colors.subText,
  },
  button: {
    width: "100%",
    minHeight: 50,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.mainStrong,
  },
  buttonDisabled: { backgroundColor: Colors.softBackground },
  buttonText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  buttonTextDisabled: { color: Colors.subText },
  email: { marginTop: 10, fontSize: 12, color: Colors.mainDark },
  readyNote: {
    marginTop: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.lightOrange,
  },
  readyNoteText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.orangeDark },
  errorBox: {
    marginTop: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.lightCoral,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.coralDark },
});
