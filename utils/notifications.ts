import type { NotificationItem } from "../api/notificationApi";

export type ExpiryDigest = {
  key: string;
  dateGroup: string;
  items: NotificationItem[];
  buckets: Array<{ daysLeft: number; label: string; ingredients: string[] }>;
  isRead: boolean;
};

export type NotificationSection = {
  dateGroup: string;
  digest: ExpiryDigest | null;
  items: NotificationItem[];
};

export function expiryDaysLeft(title: string) {
  if (title.includes("오늘까지")) return 0;
  const match = title.match(/(\d+)일\s*남/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= 3 ? value : null;
}

export function expiryIngredientName(title: string) {
  const match = title.match(/^(.+?)의\s*소비기한/);
  return match?.[1]?.trim() || title.trim();
}

export function buildNotificationSections(
  notifications: NotificationItem[],
): NotificationSection[] {
  const groups = new Map<string, NotificationItem[]>();
  notifications.forEach((item) => {
    const current = groups.get(item.dateGroup) ?? [];
    current.push(item);
    groups.set(item.dateGroup, current);
  });

  return [...groups.entries()].map(([dateGroup, groupItems]) => {
    const expiryItems = groupItems.filter(
      (item) => item.type === "expiry" && expiryDaysLeft(item.title) !== null,
    );
    const regularItems = groupItems.filter((item) => !expiryItems.includes(item));
    const buckets = [0, 1, 2, 3]
      .map((daysLeft) => ({
        daysLeft,
        label: daysLeft === 0 ? "오늘 만료" : `${daysLeft}일 남음`,
        ingredients: expiryItems
          .filter((item) => expiryDaysLeft(item.title) === daysLeft)
          .map((item) => expiryIngredientName(item.title)),
      }))
      .filter((bucket) => bucket.ingredients.length > 0);

    return {
      dateGroup,
      digest: expiryItems.length
        ? {
            key: `${dateGroup}-expiry`,
            dateGroup,
            items: expiryItems,
            buckets,
            isRead: expiryItems.every((item) => item.isRead),
          }
        : null,
      items: regularItems,
    };
  });
}
