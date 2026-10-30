import { useSession } from "../hooks/useSession";
import { Stack, useSegments } from "expo-router";

import { FridgeProvider } from "../contexts/FridgeContext";
import { RecipeProvider } from "../contexts/RecipeContext";
import { NotificationProvider } from "../contexts/NotificationContext";

export default function RootLayout() {
  const segments = useSegments();
  const session = useSession();
  const firstSegment = segments[0];
  const fridgeEnabled =
    firstSegment !== undefined &&
    firstSegment !== "login" &&
    firstSegment !== "signup" &&
    firstSegment !== "account-recovery";

  return (
    <NotificationProvider enabled={fridgeEnabled && !!session?.userId}>
      <RecipeProvider key={session?.userId ?? "guest"} userId={session?.userId}>
        <FridgeProvider enabled={fridgeEnabled && !!session?.userId}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="account-recovery" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="social-link" />
          <Stack.Screen name="support" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="qr-scanner" />
          <Stack.Screen name="qr-generator" />
        </Stack>
        </FridgeProvider>
      </RecipeProvider>
    </NotificationProvider>
  );
}
