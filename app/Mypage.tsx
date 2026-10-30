import { deleteAccount } from "@/api/userApi";
import { getLinkedProvider, removeToken } from "@/utils/token";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "../hooks/useSession";
import { mypageStyles as styles } from "../styles/appStyles";

export default function MyPageScreen() {
  const router = useRouter();
  const session = useSession();
  const [deleting, setDeleting] = useState(false);
  const linkedProvider = getLinkedProvider(session);
  const providerName = linkedProvider === "KAKAO" ? "카카오" : linkedProvider === "GOOGLE" ? "구글" : "";
  const providerIcon = linkedProvider === "KAKAO"
    ? require("../assets/login/kakao.png")
    : linkedProvider === "GOOGLE"
      ? require("../assets/login/google.png")
      : null;

  const handleLogout = async () => { await removeToken(); router.replace("/login"); };
  const executeDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount(null);
      await removeToken({ forgetSocialProvider: true });
      if (Platform.OS !== "web") Alert.alert("탈퇴 완료", "회원 탈퇴 처리가 완료되었습니다.");
      router.replace("/login");
    } catch {
      Alert.alert("탈퇴 실패", "회원 정보는 유지되었습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setDeleting(false); }
  };
  const handleDeleteAccount = () => {
    const message = "정말로 탈퇴하시겠습니까? 탈퇴 시 데이터를 복구할 수 없습니다.";
    if (Platform.OS === "web") {
      if (window.confirm(`회원 탈퇴\n\n${message}`)) void executeDeleteAccount();
      return;
    }
    Alert.alert("회원 탈퇴", message, [{ text: "취소", style: "cancel" }, { text: "탈퇴하기", style: "destructive", onPress: () => void executeDeleteAccount() }]);
  };

  return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>마이페이지</Text>
    <View style={styles.profileCard}><View style={styles.profileCircle}><Text style={styles.profileInitial}>{session?.name?.slice(0, 1) || "나"}</Text></View><View style={styles.profileCopy}><Text style={styles.userName}>{session?.name ? `${session.name}님` : "내 프로필"}</Text><View style={styles.loginIdentity} accessible accessibilityLabel={`${providerName ? `${providerName} 로그인, ` : ""}${session?.email || "로그인 이메일을 확인할 수 없어요"}`}>{providerIcon ? <Image source={providerIcon} style={styles.loginProviderIcon} accessibilityIgnoresInvertColors /> : null}<Text style={styles.userInfo} numberOfLines={1}>{session?.email || "로그인 이메일을 확인할 수 없어요"}</Text></View></View></View>
    <View style={styles.infoCard}>
      <View style={styles.infoRow}><Text style={styles.infoLabel}>건강 상태</Text><Text style={styles.infoValue}>{session?.healthCondition || "미입력"}</Text></View>
      <View style={styles.infoDivider} />
      <View style={styles.infoRow}><Text style={styles.infoLabel}>목표</Text><Text style={styles.infoValue}>{session?.healthGoal || "미입력"}</Text></View>
    </View>
    <View style={styles.section}><Text style={styles.sectionTitle}>내 정보</Text><Pressable style={styles.menuItem} onPress={() => router.push("/monthly-report")}><Text style={styles.menuText}>이번 달 소비 패턴</Text><Text style={styles.arrow}>›</Text></Pressable><Pressable style={styles.menuItem} onPress={() => router.push("/profile-edit")} accessibilityRole="button"><Text style={styles.menuText}>프로필 수정</Text><Text style={styles.arrow}>›</Text></Pressable></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>계정</Text><Pressable style={styles.menuItem} onPress={() => router.push("/account-recovery")} accessibilityRole="button"><Text style={styles.menuText}>현재 비밀번호 변경</Text><Text style={styles.arrow}>›</Text></Pressable><Pressable style={styles.menuItem} onPress={() => router.push("/social-link" as Href)} accessibilityRole="button"><Text style={styles.menuText}>소셜 로그인 연동</Text><View style={styles.menuAccessory}>{providerName ? <Text style={styles.readyBadge}>{providerName} 연동됨</Text> : null}<Text style={styles.arrow}>›</Text></View></Pressable></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>앱 설정</Text><Pressable style={styles.menuItem} onPress={() => router.push("/notification-settings" as Href)} accessibilityRole="button"><Text style={styles.menuText}>알림 설정</Text><Text style={styles.arrow}>›</Text></Pressable><Pressable style={styles.menuItem} onPress={() => router.push("/support" as Href)} accessibilityRole="button"><Text style={styles.menuText}>고객센터</Text><Text style={styles.arrow}>›</Text></Pressable></View>
    <Pressable style={styles.logoutButton} onPress={() => void handleLogout()}><Text style={styles.logoutText}>로그아웃</Text></Pressable>
    <Pressable style={styles.withdrawButton} onPress={handleDeleteAccount} disabled={deleting}>{deleting ? <ActivityIndicator /> : <Text style={styles.withdrawText}>회원탈퇴</Text>}</Pressable>
  </ScrollView></SafeAreaView>;
}
