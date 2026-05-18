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
      <Stack.Screen name="trade/[id]" options={{ title: "Trade" }} />
      <Stack.Screen name="lot/[id]" options={{ title: "Stock lot" }} />
    </Stack>
  );
}
