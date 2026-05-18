import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { Plus } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Segmented } from "@/features/wheel/components/Segmented";
import { TradesView } from "@/features/wheel/components/TradesView";
import { LotsView } from "@/features/wheel/components/LotsView";
import { WatchlistView } from "@/features/wheel/components/WatchlistView";
import { PortfolioFilter } from "@/features/wheel/components/PortfolioFilter";

type Segment = "trades" | "lots" | "watch";

export default function WheelHome() {
  const [segment, setSegment] = useState<Segment>("trades");
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
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
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/wheel/trade/new")}
              className="mr-3 p-1.5 active:opacity-60"
            >
              <Plus color="#10b981" size={22} />
            </Pressable>
          ),
        }}
      />
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

        {segment !== "watch" ? (
          <PortfolioFilter value={portfolioId} onChange={setPortfolioId} />
        ) : null}

        {segment === "trades" ? <TradesView portfolioId={portfolioId} /> : null}
        {segment === "lots" ? <LotsView portfolioId={portfolioId} /> : null}
        {segment === "watch" ? <WatchlistView /> : null}

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push("/wheel/portfolios")}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 active:bg-slate-800/80"
          >
            <Text className="text-center font-medium text-slate-200">
              Portfolios →
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/wheel/journal")}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 active:bg-slate-800/80"
          >
            <Text className="text-center font-medium text-slate-200">
              Journal →
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
