import { Stack } from "expo-router";

export default function WheelLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Wheel" }} />
      <Stack.Screen name="journal" options={{ title: "Journal" }} />
      <Stack.Screen name="portfolios/index" options={{ title: "Portfolios" }} />
      <Stack.Screen
        name="portfolios/[id]/index"
        options={{ title: "Portfolio" }}
      />
      <Stack.Screen name="trade/[id]/index" options={{ title: "Trade" }} />
      <Stack.Screen name="lot/[id]/index" options={{ title: "Stock lot" }} />
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
    </Stack>
  );
}
