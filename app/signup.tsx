import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../utils/apiError';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { sendSignupVerificationCode, signup, verifySignupCode } from '../api/userApi.js';

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  const [healthGoal, setHealthGoal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestLock = useRef(false);
  const [code, setCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if(seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleSendCode = async () => {
    if (!email || busy) return;
    setBusy(true); setError(null);
    try {
      await sendSignupVerificationCode(email.trim());
      setIsCodeSent(true);
      setSeconds(180);
    } catch (err: any) {
      setError(err.message || "인증번호 발송 실패");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || busy) return;
    setBusy(true); setError(null);
    try {
      await verifySignupCode(email.trim(), code);
      setIsVerified(true);
      setIsCodeSent(false);
    } catch (err: any) {
      setError(err.message || "인증번호가 일치하지 않습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async () => {
    if (requestLock.current) return;
    setError(null);

    if(!email.trim() || !password || !name.trim()) {
      setError("이메일, 비밀번호, 이름을 모두 입력해 주세요.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("이메일 주소를 확인해 주세요. 예: example@email.com");
      return;
    }

    requestLock.current = true;
    setSubmitting(true);
    try {
      await signup({
        email: email.trim(), password, name: name.trim(), healthCondition, healthGoal,
      });

      if (Platform.OS === "web") { router.replace("/login"); return; }
      Alert.alert("성공", "회원가입이 완료되었습니다.", [
        { text: "확인", onPress: () => router.replace("/login") }
      ]);
    } catch(error) {
      console.error("회원가입 실패: ", error);
      setError(getApiErrorMessage(error, "회원가입에 실패했습니다. 다시 시도해 주세요."));
    } finally {
      requestLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>회원가입</Text>

          <View style={styles.form}>
            <View style={styles.inputBox}>
              <Text style={styles.label}>이메일</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }, isVerified && { backgroundColor: "#f0f0f0", color: "#888" }]}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isVerified && !busy}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="example@email.com"
                />
                {!isVerified && (
                  <Pressable 
                    style={[styles.verifyButton, busy && { opacity: 0.5 }]} 
                    onPress={handleSendCode} 
                    disabled={busy}
                  >
                    <Text style={styles.verifyButtonText}>
                      {seconds > 0 ? `${seconds}초` : "인증받기"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {isCodeSent && !isVerified && (
              <View style={styles.inputBox}>
                <Text style={styles.label}>인증번호 6자리</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="000000"
                  />
                  <Pressable 
                    style={styles.verifyButton} 
                    onPress={handleVerifyCode} 
                    disabled={busy}
                  >
                    <Text style={styles.verifyButtonText}>확인</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {isVerified && (
              <>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>비밀번호</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
                <View style={styles.inputBox}>
                  <Text style={styles.label}>이름</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.label}>건강 상태</Text>
                  <TextInput
                    style={styles.input}
                    value={healthCondition}
                    onChangeText={setHealthCondition}
                    placeholder="예: 건강함, 피로함"
                    placeholderTextColor="#b5b5b5"
                  />
                </View>

                <View style={styles.inputBox}>
                  <Text style={styles.label}>목표</Text>
                  <TextInput
                    style={styles.input}
                    value={healthGoal}
                    onChangeText={setHealthGoal}
                    placeholder="예: 체중 감량, 건강 관리"
                    placeholderTextColor="#b5b5b5"
                  />
                </View>
              </>
            )}

            <Pressable 
              style={[styles.signupButton, (!isVerified || submitting) && { opacity: 0.5 }]} 
              disabled={!isVerified || submitting} 
              onPress={handleSignup}
            >
              <Text style={styles.signupButtonText}>{submitting ? "가입 중…" : "가입하기"}</Text>
            </Pressable>

            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.loginText}>이미 계정이 있으신가요? 로그인</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#f8f1e1',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#222222',
    marginBottom: 48,
  },
  form: {
    gap: 24,
  },
  inputBox: {
    width: '100%',
  },
  label: {
    fontSize: 17,
    color: '#777777',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#dddddd',
    fontSize: 16,
    paddingVertical: 8,
    color: '#222222',
  },
  signupButton: {
    backgroundColor: '#84966b',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 42,
    marginBottom: 24,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  loginText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777777',
  },
  verifyButton: 
  { width: 60, 
    height: 38, 
    backgroundColor: '#84966b', 
    borderRadius: 8, alignItems: 'center', 
    justifyContent: 'center', marginBottom: 2, 
  }, 
  verifyButtonText: { 
    color: '#ffffff', 
    fontSize: 13, 
    fontWeight: '600', 
  },
});