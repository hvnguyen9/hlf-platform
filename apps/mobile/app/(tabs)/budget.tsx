import { ScrollView, Text, View } from "react-native";

export default function BudgetScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-100 dark:bg-slate-950">
      <View className="p-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Budget & FIRE</Text>
        <Text className="text-slate-600 dark:text-slate-400 mt-1">
          Transactions, budgets, FIRE dashboard.
        </Text>
        <View className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <Text className="text-slate-700 dark:text-slate-300">Phase 5 in the rollout.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
