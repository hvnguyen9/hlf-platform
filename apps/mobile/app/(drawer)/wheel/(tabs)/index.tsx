import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { usePortalSummary } from "@/features/dashboard/usePortalSummary";
import {
  useOpenStockLots,
  useOpenTrades,
  usePortfolioMetricsBatch,
  usePortfolios,
} from "@/features/wheel/queries";
import { KpiGrid } from "@/features/wheel/components/KpiGrid";
import { PortfolioCard } from "@/features/wheel/components/PortfolioCard";
import { ExpiringSoon } from "@/features/wheel/components/ExpiringSoon";
import { EmptyState } from "@/features/wheel/components/EmptyState";
import {
  KpiGridSkeleton,
  RowSkeletonList,
} from "@/features/wheel/components/Skeleton";
import { money, pnlColor, signedMoney } from "@/features/wheel/format";

export default function WheelHome() {
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();

  const portalSummary = usePortalSummary();
  const portfolios = usePortfolios();
  const trades = useOpenTrades();
  const lots = useOpenStockLots();
  const wheel = portalSummary.data?.wheel;

  const portfolioIds = portfolios.data?.map((p) => p.id) ?? [];
  const metricsResults = usePortfolioMetricsBatch(portfolioIds);
  const metricsByPortfolio = Object.fromEntries(
    portfolioIds.map((id, i) => [id, metricsResults[i]?.data]),
  );

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
      className="flex-1 bg-slate-100 dark:bg-slate-950"
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
                    valueClass: "text-emerald-700 dark:text-emerald-300",
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
          <KpiGridSkeleton count={4} />
        ) : null}

        <View>
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Portfolios
          </Text>
          {portfolios.isLoading ? (
            <RowSkeletonList count={2} />
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
                  metrics={metricsByPortfolio[p.id]}
                />
              ))}
            </View>
          )}
        </View>

        <ExpiringSoon />
      </View>
    </ScrollView>
  );
}
