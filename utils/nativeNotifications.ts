import Constants from "expo-constants";
import { Platform } from "react-native";

// Loading expo-notifications itself raises a remote-push error in Android Expo Go.
export const nativeNotifications: typeof import("expo-notifications") | null =
  Platform.OS === "android" && Constants.appOwnership === "expo"
    ? null
    : require("expo-notifications");
