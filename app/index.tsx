import { getToken, isTokenExpired, removeToken } from "@/utils/token";
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    const checkAuthStatus = async () => {
      try {
        const token = await getToken();

        if (token && !isTokenExpired(token)) {
          // 유효한 로그인 토큰이 남아 있으면 홈으로 이동
          router.replace('/(tabs)/Home');
        } else {
          // 토큰이 없거나 만료되었으면 로그인 화면으로 이동
          if (token) await removeToken();
          router.replace('/login');
        }
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  // 스피너 표시
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fridiet</Text>
      <Text style={styles.sub}>푸시 알림 수신 대기 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  sub: { fontSize: 14, color: '#888' },
});
