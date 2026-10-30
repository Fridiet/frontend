import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SettingsScreenHeader from "../components/SettingsScreenHeader";
import { Colors } from "../constants/colors";
import { linkSocialAccount } from "@/api/userApi";
import * as WebBrowser from "expo-web-browser";
import { useSession } from "../hooks/useSession";
import { getApiErrorMessage } from "../utils/apiError";
import { getLinkedProvider, updateSessionProfile } from "../utils/token";

WebBrowser.maybeCompleteAuthSession();

const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
const LINK_CALLBACK_URI = "fridiet://oauth-callback";

const kakaoIcon = require("../assets/login/kakao.png");
const googleIcon = require("../assets/login/google.png");
type SocialProvider = "KAKAO" | "GOOGLE";

export default function SocialLinkScreen() {
  const session = useSession();
  const [linkingProvider, setLinkingProvider] = useState<SocialProvider | null>(null);
  const linkedProvider = getLinkedProvider(session);

  const handleLink = async (provider: SocialProvider) => {
    if (linkingProvider || linkedProvider || !session) return;
    const clientId = provider === "KAKAO" ? KAKAO_CLIENT_ID : GOOGLE_CLIENT_ID;
    const providerName = provider === "KAKAO" ? "카카오" : "구글";
    if (!clientId || !BASE_URL) {
      Alert.alert(`${providerName} 연동 설정 오류`, "앱의 소셜 로그인 설정을 확인해 주세요.");
      return;
    }

    setLinkingProvider(provider);
    try {
      const linkRedirectUri = `${BASE_URL}/link/oauth2/code/${provider.toLowerCase()}`;
      const authUrl = provider === "KAKAO"
        ? `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${linkRedirectUri}`
        : `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${linkRedirectUri}&scope=email%20profile`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, LINK_CALLBACK_URI);
      if (result.type !== "success" || !result.url) return;
      const code = new URL(result.url).searchParams.get("code");
      if (!code) throw new Error(`${providerName} 인증 코드를 받지 못했습니다.`);
      await linkSocialAccount({ provider, tokenOrCode: code });
      await updateSessionProfile({ socialProvider: provider });
      Alert.alert("연동 완료", `${providerName} 계정이 연결되었습니다.`);
    } catch (error) {
      Alert.alert(`${providerName} 연동 실패`, getApiErrorMessage(error, "잠시 후 다시 시도해 주세요."));
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SettingsScreenHeader title="소셜 로그인 연동" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <MaterialCommunityIcons name="link-variant" size={25} color={Colors.mainStrong} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>로그인을 더 간편하게</Text>
            <Text style={styles.introDescription}>
              {linkedProvider ? "연결된 소셜 계정을 확인할 수 있어요." : "일반 계정에 카카오 또는 구글 계정을 연결할 수 있어요."}
            </Text>
          </View>
        </View>

        <View style={styles.providerList}>
          <ProviderRow name="카카오" icon={kakaoIcon} provider="KAKAO" linked={linkedProvider === "KAKAO"} loading={linkingProvider === "KAKAO"} disabled={!!linkingProvider || !!linkedProvider || !session} onPress={handleLink} />
          <View style={styles.divider} />
          <ProviderRow name="구글" icon={googleIcon} provider="GOOGLE" linked={linkedProvider === "GOOGLE"} loading={linkingProvider === "GOOGLE"} disabled={!!linkingProvider || !!linkedProvider || !session} onPress={handleLink} />
        </View>

        <View style={styles.note}>
          <MaterialCommunityIcons name="shield-check-outline" size={19} color={Colors.mainStrong} />
          <Text style={styles.noteText}>
            {linkedProvider ? "소셜 계정은 하나만 연결할 수 있어요. 이미 연결된 계정으로 로그인해 주세요." : "연동해도 현재 계정 정보는 유지되며, 다음부터 연결한 소셜 계정으로 로그인할 수 있어요."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProviderRow({ name, icon, provider, linked, loading, disabled, onPress }: { name: string; icon: number; provider: SocialProvider; linked: boolean; loading: boolean; disabled: boolean; onPress: (provider: SocialProvider) => void }) {
  return (
    <View style={styles.providerRow}>
      <View style={styles.providerIconWrap}>
        <Image source={icon} style={styles.providerIcon} />
      </View>
      <View style={styles.providerCopy}>
        <Text style={styles.providerName}>{name}</Text>
        <Text style={styles.providerDescription}>{linked ? `${name} 계정이 연결되어 있어요` : `${name} 계정으로 간편 로그인`}</Text>
      </View>
      <Pressable style={[styles.readyBadge, linked && styles.linkedBadge, (disabled && !linked) && styles.disabled]} onPress={() => onPress(provider)} disabled={disabled || linked} accessibilityRole="button" accessibilityState={{ disabled: disabled || linked, busy: loading }}>
        {loading ? <ActivityIndicator size="small" color={Colors.mainStrong} /> : linked ? <MaterialCommunityIcons name="check" size={15} color={Colors.mainStrong} /> : null}
        <Text style={[styles.readyText, linked && styles.linkedText]}>{loading ? "연결 중" : linked ? "연동됨" : "연동하기"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: {
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  intro: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 22 },
  introIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGreen,
  },
  introCopy: { flex: 1, minWidth: 0 },
  introTitle: { fontSize: 19, fontWeight: "700", color: Colors.text },
  introDescription: { marginTop: 5, fontSize: 13, lineHeight: 19, color: Colors.subText },
  providerList: { paddingHorizontal: 16, borderRadius: 16, backgroundColor: Colors.white },
  providerRow: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12 },
  providerIconWrap: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  providerIcon: { width: 28, height: 28, resizeMode: "contain" },
  providerCopy: { flex: 1, minWidth: 0 },
  providerName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  providerDescription: { marginTop: 3, fontSize: 12, color: Colors.subText },
  readyBadge: { minHeight: 36, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 10, backgroundColor: Colors.softBackground },
  linkedBadge: { backgroundColor: Colors.lightGreen },
  readyText: { fontSize: 11, fontWeight: "700", color: Colors.subText },
  linkedText: { color: Colors.mainStrong },
  disabled: { opacity: 0.48 },
  divider: { height: 1, marginLeft: 54, backgroundColor: Colors.line },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.mainDark },
});
