import { Text, View } from "react-native";

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 p-6 items-center">
      <Text className="text-sm text-slate-500 text-center">{message}</Text>
    </View>
  );
}
