import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Segmented } from "@/features/wheel/components/Segmented";
import { TradesView } from "@/features/wheel/components/TradesView";
import { LotsView } from "@/features/wheel/components/LotsView";
import { WatchlistView } from "@/features/wheel/components/WatchlistView";

type Segment = "trades" | "lots" | "watch";

export default function WheelHome() {
  const [segment, setSegment] = useState<Segment>("trades");
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["wheel"] });
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
      <View className="p-4 gap-4">
        <Segmented<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: "trades", label: "Trades" },
            { value: "lots", label: "Lots" },
            { value: "watch", label: "Watch" },
          ]}
        />

        {segment === "trades" ? <TradesView /> : null}
        {segment === "lots" ? <LotsView /> : null}
        {segment === "watch" ? <WatchlistView /> : null}

        <Pressable
          onPress={() => router.push("/wheel/journal")}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 active:bg-slate-800/80"
        >
          <Text className="text-center font-medium text-slate-200">
            Open Journal →
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
