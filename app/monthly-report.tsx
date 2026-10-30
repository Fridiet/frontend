import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMonthlyReport, type MonthlyReport } from "../api/reportApi";

function currentMonth() {
  const korea = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${korea.getUTCFullYear()}-${String(korea.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyReportScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setReport(null);
    getMonthlyReport(month).then((result) => {
      if (active) setReport(result);
    }).catch((reason) => {
      if (active) setError(reason?.response?.status === 401
        ? "로그인이 만료됐어요. 다시 로그인해주세요."
        : "이번 달 기록을 불러오지 못했어요. 서버 연결을 확인하고 다시 시도해주세요.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, retry]));

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/Mypage")} style={styles.back}>
        <Text style={styles.link}>‹ 돌아가기</Text>
      </Pressable>
      <Text style={styles.title}>나의 월간 소비 패턴</Text>
      <Text style={styles.muted}>저장과 요리 완료 기록으로 돌아보는 한 달</Text>
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 달" disabled={month <= "2000-01"} onPress={() => setMonth(shiftMonth(month, -1))} style={styles.button}>
          <Text style={styles.link}>‹ 이전 달</Text>
        </Pressable>
        <Text style={styles.heading}>{month.replace("-", "년 ")}월</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="다음 달" disabled={month >= currentMonth()} onPress={() => setMonth(shiftMonth(month, 1))} style={[styles.button, month >= currentMonth() && styles.disabled]}>
          <Text style={styles.link}>다음 달 ›</Text>
        </Pressable>
      </View>
      {loading && <View style={styles.card}><ActivityIndicator color="#7D9568" /><Text style={styles.muted}>기록을 모으고 있어요.</Text></View>}
      {error && <View style={styles.card}>
        <Text accessibilityRole="alert" style={styles.body}>{error}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>다시 시도</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push("/login")}><Text style={styles.link}>로그인으로 이동</Text></Pressable>
      </View>}
      {report && !loading && <>
        <View style={styles.card}>
          <Text style={styles.heading}>{report.partialMonth ? "이번 달 중간 결산" : "한 달 돌아보기"}</Text>
          <Text style={styles.body}>{report.summary}</Text>
          <Text style={styles.muted}>한국 시간 기준 · 내 계정의 기록만 표시</Text>
        </View>
        <View style={styles.metrics}>
          {[['요리 완료 기록', report.cookedCount, '건'], ['저장한 레시피', report.savedRecipeCount, '개'], ['활동한 날짜', report.activeDays, '일'], ['완료한 요리 종류', report.uniqueCookedRecipes, '가지']].map(([label, value, unit]) =>
            <View key={String(label)} style={styles.metric}><Text style={styles.muted}>{label}</Text><Text style={styles.number}>{value}<Text style={styles.body}> {unit}</Text></Text></View>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>자주 만든 요리 TOP 5</Text>
          {report.topRecipes.length === 0 ? <Text style={styles.muted}>아직 요리 완료 기록이 없어요. 레시피의 ‘요리 완료’를 누르면 쌓여요.</Text>
            : report.topRecipes.map((recipe, index) => <View key={recipe.recipeKey ?? recipe.recipeName} style={styles.row}>
              <Text style={styles.recipe}>{index + 1}. {recipe.recipeName}</Text><Text style={styles.link}>{recipe.count}건</Text>
            </View>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>날짜별 활동</Text>
          <Text style={styles.muted}>기록이 있는 날짜만 표시해요. 미기록은 미조리를 뜻하지 않아요.</Text>
          {report.dailyActivity.filter(day => day.cookedCount + day.savedCount > 0).length === 0 && <Text style={styles.body}>표시할 활동이 없어요.</Text>}
          {report.dailyActivity.filter(day => day.cookedCount + day.savedCount > 0).map(day => <View key={day.date} style={styles.row}>
            <Text style={styles.body}>{day.date.slice(5).replace("-", "/")}</Text>
            <Text style={styles.body}>요리 완료 {day.cookedCount} · 저장 {day.savedCount}</Text>
          </View>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>식재료 소비·폐기</Text>
          <Text style={styles.muted}>내가 기록한 사용량입니다. 기능 도입 이전 내역과 단순 잔량 수정은 포함하지 않아요.</Text>
          {(report.stockActivity ?? []).length === 0 && <Text style={styles.body}>아직 서버에 기록된 식재료 소비·폐기가 없어요.</Text>}
          {(report.stockActivity ?? []).map(item => <View key={`${item.ingredientName}:${item.unit}`} style={{ gap: 6 }}>
            <Text style={styles.recipe}>{item.ingredientName} · {item.unit}</Text>
            <Text style={styles.body}>소비 {item.consumedQuantity == null ? `${item.consumedRecords}건 (양 미집계)` : `${item.consumedQuantity} ${item.unit}`} / 폐기 {item.discardedQuantity == null ? `${item.discardedRecords}건 (양 미집계)` : `${item.discardedQuantity} ${item.unit}`}</Text>
          </View>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>이렇게 집계했어요</Text>
          {report.notes.map(note => <Text key={note} style={styles.muted}>• {note}</Text>)}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FCF6E5" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, paddingBottom: 48, gap: 16 },
  title: { fontSize: 25, fontWeight: "700", color: "#30372B" },
  heading: { fontSize: 18, fontWeight: "700", color: "#30372B" },
  muted: { fontSize: 13, lineHeight: 21, color: "#666A60" },
  body: { fontSize: 14, lineHeight: 23, color: "#30372B" },
  link: { fontSize: 14, fontWeight: "600", color: "#536C40" },
  back: { paddingVertical: 12, alignSelf: "flex-start" },
  button: { paddingHorizontal: 10, paddingVertical: 14 },
  disabled: { opacity: 0.35 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  card: { padding: 20, borderRadius: 18, backgroundColor: "white", gap: 12 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { flexGrow: 1, flexBasis: "45%", backgroundColor: "#EDF2E8", borderRadius: 16, padding: 18, gap: 8 },
  number: { fontSize: 29, fontWeight: "700", color: "#536C40" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottomColor: "#F0F0EB", borderBottomWidth: 1, paddingVertical: 12 },
  recipe: { flex: 1, fontSize: 15, lineHeight: 22, color: "#30372B" },
});
