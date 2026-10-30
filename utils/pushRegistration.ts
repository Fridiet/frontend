import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerFcmToken } from "../api/notificationApi";
import { getSessionSnapshot, getToken } from "./token";

const requests = new Map<string, Promise<void>>();

export async function registerPushNotifications(requestPermission = false) {
  if (Platform.OS === "web" || !Device.isDevice) return;
  const userId = getSessionSnapshot()?.userId;
  const token = await getToken();
  if (!userId || !token || getSessionSnapshot()?.userId !== userId) return;
  const existing = requests.get(token);
  if (existing) return existing;
  const request = (async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "기본 알림", importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250], lightColor: "#7A8F63", sound: "default",
      });
    }
    const permission = await Notifications.getPermissionsAsync();
    const status = permission.status === "undetermined" && requestPermission
      ? (await Notifications.requestPermissionsAsync()).status : permission.status;
    if (status !== "granted") return;
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (getSessionSnapshot()?.userId !== userId || await getToken() !== token) return;
    if (typeof deviceToken.data === "string" && deviceToken.data.trim()) {
      await registerFcmToken(deviceToken.data, token);
    }
  })();
  requests.set(token, request);
  try { await request; }
  finally { if (requests.get(token) === request) requests.delete(token); }
}
