import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  useOpenStockLots,
  useOpenTrades,
  usePortfolios,
} from "@/features/wheel/queries";
import { money } from "@/features/wheel/format";
import { QueryError } from "@/features/wheel/components/QueryError";

export default function PortfoliosListScreen() {
  const portfolios = usePortfolios();
  const trades = useOpenTrades();
  const lots = useOpenStockLots();

  if (portfolios.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (portfolios.error) {
    return (
      <View className="flex-1 bg-slate-100 dark:bg-slate-950 p-4">
        <QueryError error={portfolios.error} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-100 dark:bg-slate-950">
      <View className="p-4 gap-3">
        {portfolios.data?.length === 0 ? (
          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 p-6 items-center">
            <Text className="text-sm text-slate-500 text-center">
              No portfolios yet. Create one in the web app.
            </Text>
          </View>
        ) : null}
        {portfolios.data?.map((p) => {
          const openTradeCount = trades.data?.filter(
            (t) => t.portfolioId === p.id,
          ).length ?? 0;
          const openLotCount = lots.data?.filter(
            (l) => l.portfolioId === p.id,
          ).length ?? 0;
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/wheel/portfolios/${p.id}`)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 active:bg-slate-300/80 dark:active:bg-slate-800/80"
            >
              <View className="flex-row items-baseline justify-between">
                <Text className="text-base font-semibold text-slate-900 dark:text-white">
                  {p.name}
                </Text>
                {p.startingCapital != null ? (
                  <Text className="text-sm text-slate-600 dark:text-slate-400">
                    {money(p.startingCapital, true)}
                  </Text>
                ) : null}
              </View>
              <Text className="text-xs text-slate-500 mt-1">
                {openTradeCount} open trade{openTradeCount === 1 ? "" : "s"} ·{" "}
                {openLotCount} stock lot{openLotCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
