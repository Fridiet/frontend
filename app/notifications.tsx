import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { NotificationItem } from "../api/notificationApi";
import { Colors } from "../constants/colors";
import { useNotifications } from "../contexts/NotificationContext";
import { notificationStyles as styles } from "../styles/appStyles";
import { getApiErrorMessage } from "../utils/apiError";
import { buildNotificationSections, type ExpiryDigest } from "../utils/notifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { notifications, loading, refreshing, error, refresh, markRead } = useNotifications();
  const [actionError, setActionError] = useState<string | null>(null);
  const markedThisVisit = useRef(false);
  const sections = useMemo(() => buildNotificationSections(notifications), [notifications]);
  const retry = () => {
    setActionError(null);
    void refresh(false);
  };

  const markItemsRead = useCallback(async (ids: number[]) => {
    setActionError(null);
    try {
      await markRead(ids);
    } catch (markError) {
      setActionError(getApiErrorMessage(markError, "읽음 상태를 저장하지 못했습니다. 다시 시도해 주세요."));
    }
  }, [markRead]);

  useEffect(() => {
    if (!isFocused) {
      markedThisVisit.current = false;
      return;
    }
    if (loading || markedThisVisit.current) return;
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (!unreadIds.length) return;
    markedThisVisit.current = true;
    void markItemsRead(unreadIds);
  }, [isFocused, loading, markItemsRead, notifications]);

  const handleNotificationPress = async (item: NotificationItem) => {
    await markItemsRead([item.id]);
    if (item.ingredientId) {
      router.push({ pathname: "/ingredient/[id]", params: { id: String(item.ingredientId) } });
    }
  };

  const handleDigestPress = async (digest: ExpiryDigest) => {
    await markItemsRead(digest.items.map((item) => item.id));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
            <MaterialCommunityIcons name="chevron-left" size={30} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>알림</Text>
          <Pressable style={styles.headerRight} onPress={() => void refresh(false)} accessibilityLabel="알림 새로고침" disabled={refreshing}>
            {refreshing ? <ActivityIndicator size="small" color={Colors.main} /> : <MaterialCommunityIcons name="refresh" size={22} color={Colors.mainStrong} />}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(false)} tintColor={Colors.main} colors={[Colors.main]} />}
        >
          {error || actionError ? (
            <Pressable style={styles.errorBanner} onPress={retry}>
              <MaterialCommunityIcons name="wifi-alert" size={20} color={Colors.coralDark} />
              <Text style={styles.errorBannerText}>{actionError || error}</Text>
              <Text style={styles.errorBannerAction}>다시 시도</Text>
            </Pressable>
          ) : null}

          {loading && notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.main} />
              <Text style={styles.emptyTitle}>알림을 불러오는 중이에요</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}><MaterialCommunityIcons name="bell-outline" size={38} color={Colors.main} /></View>
              <Text style={styles.emptyTitle}>새로운 알림이 없어요</Text>
              <Text style={styles.emptyDescription}>소비기한이나 냉장고 활동에 대한 알림을 알려드릴게요.</Text>
            </View>
          ) : sections.map((section) => (
            <View key={section.dateGroup} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.dateGroup}</Text>
              {section.digest ? (
                <Pressable
                  style={[styles.digestCard, section.digest.isRead && styles.readNotificationCard]}
                  onPress={() => void handleDigestPress(section.digest!)}
                  accessibilityRole="button"
                  accessibilityLabel={`${section.dateGroup} 소비기한 알림 ${section.digest.items.length}개`}
                >
                  <View style={styles.digestHeading}>
                    <View style={[styles.iconContainer, styles.expiryIcon]}><MaterialCommunityIcons name="clock-outline" size={23} color={Colors.coral} /></View>
                    <View style={styles.notificationContent}>
                      <View style={styles.titleRow}>
                        <Text style={styles.notificationTitle}>소비기한 알림 모아보기</Text>
                        {!section.digest.isRead ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.notificationMessage}>{section.digest.items.length}개 재료의 소비기한을 확인해 주세요.</Text>
                    </View>
                  </View>
                  <View style={styles.digestList}>
                    {section.digest.buckets.map((bucket) => (
                      <View key={bucket.daysLeft} style={styles.digestRow}>
                        <Text style={[styles.digestLabel, bucket.daysLeft === 0 && styles.digestLabelUrgent]}>{bucket.label}</Text>
                        <Text style={styles.digestIngredients}>{bucket.ingredients.join(", ")}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.notificationTime}>{section.digest.items[0]?.time}</Text>
                </Pressable>
              ) : null}
              {section.items.map((item) => (
                <Pressable key={item.id} style={[styles.notificationCard, item.isRead && styles.readNotificationCard]} onPress={() => void handleNotificationPress(item)}>
                  <View style={[styles.iconContainer, styles.fridgeIcon]}><MaterialCommunityIcons name="fridge-outline" size={23} color={Colors.main} /></View>
                  <View style={styles.notificationContent}>
                    <View style={styles.titleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{!item.isRead ? <View style={styles.unreadDot} /> : null}</View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
