import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { tabLayoutStyles as styles } from "../../styles/appStyles";
import { getToken, isTokenExpired, removeToken } from "../../utils/token";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = await getToken();

      if (!token || isTokenExpired(token)) {
        if (token) await removeToken();
        router.replace("/login");
        return;
      }

      setAuthReady(true);
    };

    void checkAuthentication();
  }, [router]);

  if (!authReady) {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator size="large" color={Colors.main} />
      </View>
    );
  }

  return (
    <Tabs
        screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: Colors.main,
        tabBarInactiveTintColor: Colors.subText,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },

        tabBarStyle: {
          position: "absolute",

          left: 0,
          right: 0,
          bottom: 0,

          height: 68 + insets.bottom,

          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),

          backgroundColor: Colors.white,

          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,

          elevation: 8,

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        }}
      >
      <Tabs.Screen
        name="Home"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "home" : "home-outline"}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Fridge"
        options={{
          title: "냉장고",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="fridge-outline"
              size={size + 1}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Recipe"
        options={{
          title: "레시피",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chef-hat"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Calendar"
        options={{
          title: "캘린더",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "calendar" : "calendar-outline"}
              size={size + 1}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="Cart"
        options={{
          title: "장바구니",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "cart" : "cart-outline"}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
        <Tabs.Screen
          name="receipt/review"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
    </Tabs>
  );
}
