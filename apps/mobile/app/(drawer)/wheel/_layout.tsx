// Wheel's outer Stack: wraps the inner (tabs) navigator and the detail/modal
// routes (trade/[id], lot/[id], portfolios/[id], alerts/new, trade/new, etc.)
// so pushes happen ABOVE the tabs UI instead of inside one tab.

import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export default function WheelLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#0f172a" : "#ffffff" },
        headerTintColor: isDark ? "#f8fafc" : "#0f172a",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trade/[id]/index" options={{ title: "Trade" }} />
      <Stack.Screen name="lot/[id]/index" options={{ title: "Stock lot" }} />
      <Stack.Screen
        name="portfolios/[id]/index"
        options={{ title: "Portfolio" }}
      />
      <Stack.Screen
        name="trade/new"
        options={{ title: "New trade", presentation: "modal" }}
      />
      <Stack.Screen
        name="trade/[id]/close"
        options={{ title: "Close trade", presentation: "modal" }}
      />
      <Stack.Screen
        name="trade/[id]/add"
        options={{ title: "Add contracts", presentation: "modal" }}
      />
      <Stack.Screen
        name="trade/[id]/notes"
        options={{ title: "Trade notes", presentation: "modal" }}
      />
      <Stack.Screen
        name="lot/[id]/sell"
        options={{ title: "Sell shares", presentation: "modal" }}
      />
      <Stack.Screen
        name="lot/[id]/add"
        options={{ title: "Add shares", presentation: "modal" }}
      />
      <Stack.Screen
        name="lot/[id]/notes"
        options={{ title: "Lot notes", presentation: "modal" }}
      />
      <Stack.Screen
        name="alerts/new"
        options={{ title: "New alert", presentation: "modal" }}
      />
    </Stack>
  );
}
