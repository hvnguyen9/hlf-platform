import { Text, View } from "react-native";

export function QueryError({ error }: { error: unknown }) {
  return (
    <View className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-100 dark:bg-rose-950/40 p-4">
      <Text className="text-rose-700 dark:text-rose-300 font-medium">
        Couldn't load
      </Text>
      <Text className="text-rose-700/80 dark:text-rose-400/80 text-sm mt-1">
        {error instanceof Error ? error.message : "Unknown error"}
      </Text>
    </View>
  );
}
