import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from "../api/notificationApi";
import { getApiErrorMessage } from "../utils/apiError";
import { registerPushNotifications } from "../utils/pushRegistration";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
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

export function NotificationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async (showSpinner = true) => {
    if (!enabled) return;
    const version = requestVersion.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const next = await getNotifications();
      if (version === requestVersion.current) setNotifications(next);
    } catch (refreshError) {
      if (version === requestVersion.current) setError(getApiErrorMessage(refreshError, "알림을 불러오지 못했습니다."));
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    const version = ++requestVersion.current;
    if (!enabled) {
      setNotifications([]);
      setError(null);
      setLoading(false);
    } else {
      void registerPushNotifications(true).catch(() => {
        if (version === requestVersion.current) setError("기기 알림을 등록하지 못했어요. 알림 설정에서 권한을 확인해 주세요.");
      });
      void refresh();
    }
    return () => { requestVersion.current += 1; };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const register = () => void registerPushNotifications().catch(() => {
      if (active) setError("푸시 알림을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.");
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") register();
    });
    const tokenChange = Notifications.addPushTokenListener(register);
    return () => { active = false; appState.remove(); tokenChange.remove(); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
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
    const version = requestVersion.current;
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
      if (version === requestVersion.current) setNotifications(previous);
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
