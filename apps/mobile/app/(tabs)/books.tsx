import { ScrollView, Text, View } from "react-native";

export default function BooksScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4">
        <Text className="text-2xl font-bold text-white">Bookkeeping</Text>
        <Text className="text-slate-400 mt-1">
          Income, expenses, recurring entries, tax estimate.
        </Text>
        <View className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-slate-300">Phase 4 in the rollout.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
