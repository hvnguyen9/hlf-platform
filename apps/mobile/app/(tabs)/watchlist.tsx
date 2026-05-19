import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { WatchlistView } from "@/features/wheel/components/WatchlistView";

export default function WatchlistScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["wheel", "watchlist"] }),
      qc.invalidateQueries({ queryKey: ["wheel", "quotes"] }),
    ]);
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#10b981"
        />
      }
    >
      <View className="p-4 gap-3">
        <Text className="text-2xl font-bold text-white">Watchlist</Text>
        <Text className="text-slate-400 text-sm">
          Live quotes for tickers you watch and your auto-derived positions.
        </Text>
        <WatchlistView />
      </View>
    </ScrollView>
  );
}
