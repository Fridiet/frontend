function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export const Features = Object.freeze({
  accountRecovery: enabled(process.env.EXPO_PUBLIC_ENABLE_ACCOUNT_RECOVERY),
  containerSplit: enabled(process.env.EXPO_PUBLIC_ENABLE_CONTAINER_SPLIT),
  mealMutations: enabled(process.env.EXPO_PUBLIC_ENABLE_MEAL_MUTATIONS),
  profileNameEdit: enabled(process.env.EXPO_PUBLIC_ENABLE_PROFILE_NAME_EDIT),
  notificationSettings: enabled(
    process.env.EXPO_PUBLIC_ENABLE_NOTIFICATION_SETTINGS,
  ),
});

