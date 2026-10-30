import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATION_SLOTS = ["09:00", "13:00", "19:00"] as const;

export type NotificationSlot = (typeof NOTIFICATION_SLOTS)[number];

export type NotificationPreferences = {
  pushEnabled: boolean;
  expiryEnabled: boolean;
  fridgeActivityEnabled: boolean;
  expirySlot: NotificationSlot;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.freeze({
  pushEnabled: true,
  expiryEnabled: true,
  fridgeActivityEnabled: true,
  expirySlot: "09:00",
});

export function notificationPreferencesKey(userId: string | number) {
  return `notification_preferences:${String(userId)}:v1`;
}

export function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NotificationPreferences>;
  return (
    typeof candidate.pushEnabled === "boolean" &&
    typeof candidate.expiryEnabled === "boolean" &&
    typeof candidate.fridgeActivityEnabled === "boolean" &&
    typeof candidate.expirySlot === "string" &&
    NOTIFICATION_SLOTS.includes(candidate.expirySlot as NotificationSlot)
  );
}

export async function loadNotificationPreferences(userId: string | number) {
  try {
    const stored = await AsyncStorage.getItem(notificationPreferencesKey(userId));
    if (!stored) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    const parsed: unknown = JSON.parse(stored);
    return isNotificationPreferences(parsed)
      ? { ...parsed }
      : { ...DEFAULT_NOTIFICATION_PREFERENCES };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function saveNotificationPreferences(
  userId: string | number,
  preferences: NotificationPreferences,
) {
  if (!isNotificationPreferences(preferences)) {
    throw new Error("유효하지 않은 알림 설정입니다.");
  }
  await AsyncStorage.setItem(
    notificationPreferencesKey(userId),
    JSON.stringify(preferences),
  );
}

export function mergeServerNotificationPreferences(
  stored: NotificationPreferences,
  response: unknown,
): NotificationPreferences {
  const value = response && typeof response === "object"
    ? response as Record<string, unknown> : {};
  return {
    pushEnabled: typeof value.pushEnabled === "boolean" ? value.pushEnabled : stored.pushEnabled,
    expiryEnabled: typeof value.expiryEnabled === "boolean" ? value.expiryEnabled : stored.expiryEnabled,
    fridgeActivityEnabled: typeof value.fridgeActivityEnabled === "boolean" ? value.fridgeActivityEnabled : stored.fridgeActivityEnabled,
    expirySlot: NOTIFICATION_SLOTS.includes(value.notificationTime as NotificationSlot)
      ? value.notificationTime as NotificationSlot : stored.expirySlot,
  };
}

export async function saveServerNotificationPreferences(
  userId: string | number,
  preferences: NotificationPreferences,
  saveToServer: (value: NotificationPreferences) => Promise<unknown>,
) {
  if (!isNotificationPreferences(preferences)) throw new Error("알림 설정을 확인해 주세요.");
  await saveToServer(preferences);
  try {
    await saveNotificationPreferences(userId, preferences);
    return true;
  } catch {
    // A cache failure must not undo a setting already accepted by the server.
    return false;
  }
}
