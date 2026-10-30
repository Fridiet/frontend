import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecentPurchase = {
  id: string;
  itemId: number;
  itemName: string;
  quantityText: string;
  locationCategory: "REFRIGERATED" | "FROZEN" | "ROOM_TEMP";
  expirationDate: string;
  completedAt: string;
};

const MAX_RECENT_PURCHASES = 20;

function storageKey(userId: string, fridgeId: number) {
  return `fridiet:recent-purchases:v1:${userId}:${fridgeId}`;
}

function isRecentPurchase(value: unknown): value is RecentPurchase {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RecentPurchase>;
  return typeof item.id === "string"
    && typeof item.itemId === "number"
    && typeof item.itemName === "string"
    && typeof item.quantityText === "string"
    && typeof item.expirationDate === "string"
    && typeof item.completedAt === "string"
    && !Number.isNaN(Date.parse(item.completedAt))
    && ["REFRIGERATED", "FROZEN", "ROOM_TEMP"].includes(item.locationCategory ?? "");
}

export async function loadRecentPurchases(userId: string, fridgeId: number) {
  const raw = await AsyncStorage.getItem(storageKey(userId, fridgeId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isRecentPurchase).slice(0, MAX_RECENT_PURCHASES) : [];
}

export async function storeRecentPurchases(userId: string, fridgeId: number, purchases: RecentPurchase[]) {
  const next = purchases.slice(0, MAX_RECENT_PURCHASES);
  await AsyncStorage.setItem(storageKey(userId, fridgeId), JSON.stringify(next));
  return next;
}

export function mergeRecentPurchases(current: RecentPurchase[], incoming: RecentPurchase[]) {
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [
    ...incoming,
    ...current.filter((item) => !incomingIds.has(item.id)),
  ].slice(0, MAX_RECENT_PURCHASES);
}
