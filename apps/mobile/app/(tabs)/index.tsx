import { ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4">
        <Text className="text-2xl font-bold text-white">Dashboard</Text>
        <Text className="text-slate-400 mt-1">
          Cross-app KPIs and recent alerts land here.
        </Text>

        <View className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-sm font-medium text-emerald-400">
            Scaffold ready
          </Text>
          <Text className="text-slate-300 mt-2">
            Next: token-based sign-in, then portal-summary fetch.
          </Text>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-xs text-slate-500">Open positions</Text>
            <Text className="text-2xl font-semibold text-white mt-1">—</Text>
          </View>
          <View className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <Text className="text-xs text-slate-500">MTD P&L</Text>
            <Text className="text-2xl font-semibold text-white mt-1">—</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
