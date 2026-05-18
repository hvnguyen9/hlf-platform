import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Text className="text-xl font-semibold text-white">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-emerald-400">Go to home</Text>
        </Link>
      </View>
    </>
  );
}
