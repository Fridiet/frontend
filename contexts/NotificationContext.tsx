import { useRouter } from "expo-router";
import * as Device from "expo-device";
import type { NotificationBehavior } from "expo-notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";

import {
  getNotifications,
  markNotificationRead,
  registerFcmToken,
  type NotificationItem,
} from "../api/notificationApi";
import { getApiErrorMessage } from "../utils/apiError";
import { nativeNotifications as Notifications } from "../utils/nativeNotifications";

// Expo Go cannot register Android remote push tokens. Keep API inbox usable.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as NotificationBehavior),
});

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (showSpinner?: boolean) => Promise<void>;
  markRead: (ids: number[]) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

async function setupNotificationChannel() {
  if (Platform.OS !== "android" || !Notifications) return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "기본 알림",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#7A8F63",
    sound: "default",
  });
}

async function registerDeviceToken() {
  if (!Device.isDevice || !Notifications) return;
  await setupNotificationChannel();
  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === "granted"
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return;
  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data === "string" && token.data.trim()) {
    await registerFcmToken(token.data);
  }
}

export function NotificationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showSpinner = true) => {
    if (!enabled) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      setNotifications(await getNotifications());
    } catch (refreshError) {
      setError(getApiErrorMessage(refreshError, "알림을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }
    void setupNotificationChannel();
    void registerDeviceToken().catch(() => undefined);
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !Notifications) return;
    const received = Notifications.addNotificationReceivedListener(() => {
      void refresh(false);
    });
    const responded = Notifications.addNotificationResponseReceivedListener(() => {
      void refresh(false);
      router.push("/notifications");
    });
    return () => {
      received.remove();
      responded.remove();
    };
  }, [enabled, refresh, router]);

  const markRead = useCallback(async (ids: number[]) => {
    const targetIds = [...new Set(ids)].filter((id) =>
      notifications.some((item) => item.id === id && !item.isRead),
    );
    if (!targetIds.length) return;
    const previous = notifications;
    setNotifications((current) => current.map((item) =>
      targetIds.includes(item.id) ? { ...item, isRead: true } : item,
    ));
    try {
      await Promise.all(targetIds.map(markNotificationRead));
    } catch (markError) {
      setNotifications(previous);
      throw markError;
    }
  }, [notifications]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
    loading,
    refreshing,
    error,
    refresh,
    markRead,
  }), [error, loading, markRead, notifications, refresh, refreshing]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("NotificationProvider가 필요합니다.");
  return context;
}
