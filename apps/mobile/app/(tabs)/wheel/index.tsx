import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { usePortalSummary } from "@/features/dashboard/usePortalSummary";
import {
  useOpenStockLots,
  useOpenTrades,
  usePortfolios,
} from "@/features/wheel/queries";
import { KpiGrid } from "@/features/wheel/components/KpiGrid";
import { PortfolioCard } from "@/features/wheel/components/PortfolioCard";
import { ExpiringSoon } from "@/features/wheel/components/ExpiringSoon";
import { EmptyState } from "@/features/wheel/components/EmptyState";
import { money, pnlColor, signedMoney } from "@/features/wheel/format";

export default function WheelHome() {
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const portalSummary = usePortalSummary();
  const portfolios = usePortfolios();
  const trades = useOpenTrades();
  const lots = useOpenStockLots();
  const wheel = portalSummary.data?.wheel;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["wheel"] }),
      qc.invalidateQueries({ queryKey: ["portal-summary"] }),
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
      <View className="p-4 gap-5">
        {wheel ? (
          (() => {
            const openPremium =
              trades.data?.reduce(
                (sum, t) => sum + t.contractPrice * t.contractsOpen * 100,
                0,
              ) ?? 0;
            return (
              <KpiGrid
                items={[
                  {
                    label: "Open positions",
                    value: String(wheel.openTradeCount),
                    sub: `${wheel.openLotCount} stock lot${wheel.openLotCount === 1 ? "" : "s"}`,
                  },
                  {
                    label: "Open premium",
                    value: money(openPremium, true),
                    sub: "if all expire worthless",
                    valueClass: "text-emerald-300",
                  },
                  {
                    label: "MTD trading",
                    value: signedMoney(wheel.mtdRealizedPnl, true),
                    valueClass: pnlColor(wheel.mtdRealizedPnl),
                  },
                  {
                    label: "YTD trading",
                    value: signedMoney(wheel.ytdRealizedPnl, true),
                    valueClass: pnlColor(wheel.ytdRealizedPnl),
                  },
                ]}
              />
            );
          })()
        ) : portalSummary.isLoading ? (
          <View className="py-6 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : null}

        <View>
          <Text className="text-sm font-semibold text-slate-300 mb-2">
            Portfolios
          </Text>
          {portfolios.isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#10b981" />
            </View>
          ) : portfolios.data?.length === 0 ? (
            <EmptyState message="No portfolios yet. Create one in the web app." />
          ) : (
            <View className="gap-2">
              {portfolios.data?.map((p) => (
                <PortfolioCard
                  key={p.id}
                  portfolio={p}
                  openTrades={trades.data ?? []}
                  openLots={lots.data ?? []}
                />
              ))}
            </View>
          )}
        </View>

        <ExpiringSoon />

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push("/wheel/watchlist")}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 active:bg-slate-800/80"
          >
            <Text className="text-center font-medium text-slate-200">
              Watchlist →
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
