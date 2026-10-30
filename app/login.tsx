import apiClient from "@/api/client";
import { saveToken } from "@/utils/token";
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";

WebBrowser.maybeCompleteAuthSession();

const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const REDIRECT_URI = "fridiet://login-callback";
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

const kakaoIcon = require("../assets/login/kakao.png");
const googleIcon = require("../assets/login/google.png");
const fridietIcon = require("../assets/fridiet/Fridiet-logo.png");

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLoginSuccess = async(token: string, userData: any = {}, loginProvider: "EMAIL" | "KAKAO" | "GOOGLE" = "EMAIL") => {
    await saveToken(token, {
      ...userData,
      loginProvider,
      socialProvider: loginProvider === "EMAIL" ? userData?.socialProvider : loginProvider,
    });
    router.replace("/(tabs)/Home");
  }

  const handleLogin = async () => {
    if(!email || !password) {
      Alert.alert('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await apiClient.post('/api/auth/login', { email: email.trim(), password });
      const token = response.data.token;

      if(token) {
        await handleLoginSuccess(token, response.data, "EMAIL");
      } else {
        throw new Error("로그인 토큰을 받지 못했습니다.");
      }
    } catch(error) {
      console.error('로그인 실패: ', error);
      Alert.alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleKakaoLogin = async() => {
    try {
      if (!KAKAO_CLIENT_ID || !BASE_URL || !REDIRECT_URI) {
        Alert.alert('카카오 로그인 설정이 누락되었습니다.');
        return;
      }

      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_CLIENT_ID}&redirect_uri=${BASE_URL}/login/oauth2/code/kakao`;

      const result = await WebBrowser.openAuthSessionAsync(kakaoAuthUrl, REDIRECT_URI);

      if (result.type !== 'success' || !result.url) return;

      const urlObj = new URL(result.url);
      const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('accessToken');

      if(!token) {
        Alert.alert(
          '카카오 로그인 연결 오류',
          '백엔드 인증 후 앱으로 로그인 결과가 전달되지 않았습니다.',
        );
        return;
      }
      await handleLoginSuccess(token, { name: urlObj.searchParams.get('name') || '' }, "KAKAO");

    } catch(error) {
      console.error('카카오 로그인 에러: ', error);
      Alert.alert('카카오 로그인 실패', '잠시 후 다시 시도해 주세요.');
    }
  };
  
  const handleGoogleLogin = async() => {
    try {

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${BASE_URL}/login/oauth2/code/google&scope=email%20profile`;

      const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, REDIRECT_URI);
    
      if (result.type !== 'success' || !result.url) return;

      const urlObj = new URL(result.url);
      const token = urlObj.searchParams.get('token') || urlObj.searchParams.get('accessToken');

      if(!token) {
        Alert.alert(
          '구글 로그인 연결 오류',
          '백엔드 인증 후 앱으로 로그인 결과가 전달되지 않았습니다.',
        );
        return;
      }
      await handleLoginSuccess(token, { name: urlObj.searchParams.get('name') || '' }, "GOOGLE");

    } catch(error) {
      console.error('구글 로그인 에러: ', error);
      Alert.alert('구글 로그인 실패', '잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {/* 브랜드 영역 */}
          <View style={styles.brandArea}>
            <Image source={fridietIcon} style={styles.logo} />

            <Text style={styles.brandName}>Fridiet</Text>

            <Text style={styles.description}>
              냉장고 속 재료로, 나에게 맞는 한 끼를
            </Text>
          </View>

          {/* 로그인 입력 */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="이메일"
              keyboardType="email-address"
              autoCorrect={false}
              placeholderTextColor={Colors.subText}
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={Colors.subText}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>로그인</Text>
          </Pressable>

          {/* 계정 관련 메뉴 */}
          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push("/account-recovery")}>
              <Text style={styles.linkText}>이메일 확인 · 비밀번호 재설정</Text>
            </Pressable>

            <Text style={styles.divider}>|</Text>

            <Pressable onPress={() => router.push("/signup")}>
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>
          </View>

          {/* 소셜 로그인 구분선 */}
          <View style={styles.socialDivider}>
            <View style={styles.line} />
            <Text style={styles.socialText}>간편 로그인</Text>
            <View style={styles.line} />
          </View>

          {/* 소셜 로그인 */}
          <View style={styles.socialRow}>
            <Pressable style={styles.kakaoButton} onPress={handleKakaoLogin}>
              <Image source={kakaoIcon} style={styles.kakaoIcon} />
            </Pressable>
            
            <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
              <Image source={googleIcon} style={styles.googleIcon} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  card: {
    width: "100%",
    paddingVertical: 26,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: Colors.white,
  },

  brandArea: {
    alignItems: "center",
    marginBottom: 22,
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: -10,
  },

  brandName: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.main,
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.subText,
    textAlign: "center",
  },

  inputArea: {
    gap: 16,
    marginBottom: 24,
  },

  input: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    fontSize: 15,
    color: Colors.text,
  },

  loginButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.main,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  linkText: {
    fontSize: 12,
    color: Colors.subText,
  },

  divider: {
    fontSize: 12,
    color: Colors.line,
    marginHorizontal: 6,
  },

  socialDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.line,
  },

  socialText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.subText,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },

  kakaoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  kakaoIcon: {
    width: 44,
    height: 44,
    resizeMode: "cover",
  },

  googleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },

  googleIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});
