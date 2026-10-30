import AsyncStorage from "@react-native-async-storage/async-storage";

const LEDGER_KEY = "fridiet_local_inventory_activity_v1";
const STARTED_AT_KEY = "fridiet_local_inventory_activity_started_at";

export type InventoryActivityType = "QR_USE" | "CONSUMED" | "DISCARDED";

export type InventoryActivity = {
  id: string;
  fridgeId: number;
  ingredientName: string;
  type: InventoryActivityType;
  quantity: number | null;
  unit: string | null;
  customText: string | null;
  occurredAt: string;
};

export async function getInventoryActivities(fridgeId: number) {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as InventoryActivity[]).filter(
      (activity) => activity.fridgeId === fridgeId,
    );
  } catch {
    return [];
  }
}

export async function addInventoryActivity(
  activity: Omit<InventoryActivity, "id" | "occurredAt"> & {
    occurredAt?: string;
  },
) {
  const raw = await AsyncStorage.getItem(LEDGER_KEY);
  let current: InventoryActivity[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) current = parsed as InventoryActivity[];
  } catch {
    current = [];
  }

  const next: InventoryActivity = {
    ...activity,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: activity.occurredAt ?? new Date().toISOString(),
  };
  await AsyncStorage.multiSet([
    [LEDGER_KEY, JSON.stringify([...current, next])],
    [STARTED_AT_KEY, (await AsyncStorage.getItem(STARTED_AT_KEY)) ?? next.occurredAt],
  ]);
  return next;
}

export async function getActivityTrackingStartedAt() {
  return AsyncStorage.getItem(STARTED_AT_KEY);
}

