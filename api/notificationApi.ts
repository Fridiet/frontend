import apiClient from "./client";

import { NotificationSlot, NotificationPreferences } from "@/utils/notificationPreferences";

export type NotificationType = "expiry" | "fridge" | string;

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  dateGroup: string;
  isRead: boolean;
  ingredientId?: number | null;
};

export interface NotificationSettingsDto {
  pushEnabled: boolean;
  expiryEnabled: boolean;
  fridgeActivityEnabled: boolean;
  notificationTime: NotificationSlot;
}

export async function getNotifications() {
  const response = await apiClient.get<NotificationItem[]>("/api/notifications");
  return response.data;
}

export async function markNotificationRead(notificationId: number) {
  await apiClient.patch(`/api/notifications/${notificationId}/read`);
}

export async function registerFcmToken(fcmToken: string) {
  await apiClient.post("/api/users/me/fcm-token", { fcmToken });
}

export async function getNotificationSettings() {
  const response = await apiClient.get('/api/users/me/notification-settings');
  return response.data;
}

export async function updateNotificationSettings(settings:NotificationSettingsDto) {
  const response = await apiClient.patch('/api/users/me/notification-settings', settings);
  return response.data;
}
