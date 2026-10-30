function enabled(value: string | undefined, fallback = false) {
  return value === undefined ? fallback : value.trim().toLowerCase() === "true";
}

export const Features = Object.freeze({
  accountRecovery: enabled(process.env.EXPO_PUBLIC_ENABLE_ACCOUNT_RECOVERY, true),
  containerSplit: enabled(process.env.EXPO_PUBLIC_ENABLE_CONTAINER_SPLIT),
  mealMutations: enabled(process.env.EXPO_PUBLIC_ENABLE_MEAL_MUTATIONS),
  notificationSettings: enabled(
    process.env.EXPO_PUBLIC_ENABLE_NOTIFICATION_SETTINGS,
  ),
});

