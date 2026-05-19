import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClosedHistory,
  useOpenStockLots,
  useOpenTrades,
  usePortfolioMetrics,
  usePortfolios,
} from "@/features/wheel/queries";
import {
  deployedColor,
  dte,
  money,
  pnlColor,
  shortDate,
  signedMoney,
  winRateColor,
} from "@/features/wheel/format";
import { Segmented } from "@/features/wheel/components/Segmented";
import { KpiGrid } from "@/features/wheel/components/KpiGrid";
import { EmptyState } from "@/features/wheel/components/EmptyState";
import { QueryError } from "@/features/wheel/components/QueryError";
import {
  KpiGridSkeleton,
  RowSkeletonList,
} from "@/features/wheel/components/Skeleton";
import { TypeBadge } from "@/features/wheel/components/TypeBadge";
import type { ClosedHistoryItem } from "@/features/wheel/types";

type Segment = "open" | "closed";

function ClosedRow({ item }: { item: ClosedHistoryItem }) {
  if (item.kind === "trade") {
    const realized = item.premiumCaptured ?? 0;
    return (
      <Pressable
        onPress={() => router.push(`/wheel/trade/${item.id}`)}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 active:bg-slate-300/80 dark:active:bg-slate-800/80"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.ticker}
            </Text>
            <TypeBadge type={item.type} />
          </View>
          <Text className={`text-sm font-medium ${pnlColor(realized)}`}>
            {signedMoney(realized)}
          </Text>
        </View>
        <Text className="text-xs text-slate-500 mt-1">
          ${item.strikePrice} · closed {shortDate(item.closedAt)}
          {item.closeReason ? ` · ${item.closeReason}` : ""}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/wheel/lot/${item.id}`)}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 active:bg-slate-300/80 dark:active:bg-slate-800/80"
    >
      <View className="flex-row items-baseline justify-between">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-sm font-semibold text-slate-900 dark:text-white">{item.ticker}</Text>
          <Text className="text-xs text-slate-500">{item.shares} sh</Text>
        </View>
        <Text
          className={`text-sm font-medium ${pnlColor(item.realizedPnl ?? 0)}`}
        >
          {signedMoney(item.realizedPnl ?? 0)}
        </Text>
      </View>
      <Text className="text-xs text-slate-500 mt-1">
        avg ${item.avgCost.toFixed(2)} → ${item.closePrice?.toFixed(2) ?? "—"} ·
        closed {shortDate(item.closedAt)}
      </Text>
    </Pressable>
  );
}

export default function PortfolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const portfolios = usePortfolios();
  const metrics = usePortfolioMetrics(id);
  const openTrades = useOpenTrades();
  const openLots = useOpenStockLots();
  const closed = useClosedHistory(id);
  const qc = useQueryClient();
  const [segment, setSegment] = useState<Segment>("open");
  const [refreshing, setRefreshing] = useState(false);

  const portfolio = portfolios.data?.find((p) => p.id === id);
  const portfolioTrades = openTrades.data?.filter((t) => t.portfolioId === id) ?? [];
  const portfolioLots = openLots.data?.filter((l) => l.portfolioId === id) ?? [];

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["wheel"] });
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
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push(`/wheel/trade/new?portfolioId=${id}`)
              }
              className="mr-3 p-1.5 active:opacity-60"
            >
              <Plus color="#10b981" size={22} />
            </Pressable>
          ),
        }}
      />
      <View className="p-4 gap-4">
        <View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            {portfolio?.name ?? "Portfolio"}
          </Text>
          {portfolio?.startingCapital != null ? (
            <Text className="text-xs text-slate-500 mt-1">
              starting capital {money(portfolio.startingCapital, true)}
            </Text>
          ) : null}
        </View>

        {metrics.isLoading ? (
          <KpiGridSkeleton count={6} />
        ) : metrics.error ? (
          <QueryError error={metrics.error} />
        ) : metrics.data ? (
          <KpiGrid
            items={[
              {
                label: "Current capital",
                value: money(metrics.data.currentCapital, true),
                sub: `cash ${money(metrics.data.cashAvailable, true)}`,
              },
              {
                label: "% deployed",
                value: `${metrics.data.percentCapitalDeployed.toFixed(1)}%`,
                sub: `${money(metrics.data.capitalUsed, true)} used`,
              },
              {
                label: "MTD",
                value: signedMoney(metrics.data.realizedMTD),
                valueClass: pnlColor(metrics.data.realizedMTD),
              },
              {
                label: "YTD",
                value: signedMoney(metrics.data.realizedYTD),
                valueClass: pnlColor(metrics.data.realizedYTD),
              },
              {
                label: "Win rate",
                value:
                  metrics.data.winRate != null
                    ? `${(metrics.data.winRate * 100).toFixed(0)}%`
                    : "—",
                sub:
                  metrics.data.avgPLPercent != null
                    ? `avg ${metrics.data.avgPLPercent.toFixed(1)}%`
                    : undefined,
                valueClass: winRateColor(metrics.data.winRate),
              },
              {
                label: "Open",
                value: String(metrics.data.openTradesCount),
                sub: `${metrics.data.expiringInSevenDays} expire in 7d`,
              },
            ]}
          />
        ) : null}

        <Segmented<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />

        {segment === "open" ? (
          <View className="gap-4">
            <View>
              <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Open trades ({portfolioTrades.length})
              </Text>
              {portfolioTrades.length === 0 ? (
                <EmptyState message="No open trades in this portfolio." />
              ) : (
                <View className="gap-2">
                  {portfolioTrades.map((t) => {
                    const days = dte(t.expirationDate);
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => router.push(`/wheel/trade/${t.id}`)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 active:bg-slate-300/80 dark:active:bg-slate-800/80"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                              {t.ticker}
                            </Text>
                            <TypeBadge type={t.type} />
                          </View>
                          <Text className="text-xs text-slate-600 dark:text-slate-400">
                            {days < 0 ? `${-days}d past` : `${days}d`}
                          </Text>
                        </View>
                        <Text className="text-xs text-slate-500 mt-1">
                          ${t.strikePrice} · exp {shortDate(t.expirationDate)} ·{" "}
                          {t.contractsOpen}x @ ${t.contractPrice.toFixed(2)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View>
              <Text className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                Open stock lots ({portfolioLots.length})
              </Text>
              {portfolioLots.length === 0 ? (
                <EmptyState message="No open stock lots in this portfolio." />
              ) : (
                <View className="gap-2">
                  {portfolioLots.map((lot) => (
                    <Pressable
                      key={lot.id}
                      onPress={() => router.push(`/wheel/lot/${lot.id}`)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 active:bg-slate-300/80 dark:active:bg-slate-800/80"
                    >
                      <View className="flex-row items-baseline justify-between">
                        <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                          {lot.ticker}
                        </Text>
                        <Text className="text-xs text-slate-700 dark:text-slate-300">
                          {lot.shares} sh
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-500 mt-1">
                        avg ${lot.avgCost.toFixed(2)} · basis{" "}
                        {money(lot.shares * lot.avgCost)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {segment === "closed" ? (
          <View>
            {closed.isLoading ? (
              <RowSkeletonList count={4} />
            ) : closed.error ? (
              <QueryError error={closed.error} />
            ) : closed.data ? (
              <View className="gap-3">
                {closed.data.total > 0 ? (
                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <Text className="text-[10px] uppercase tracking-wide text-slate-500">
                        Premium
                      </Text>
                      <Text
                        className={`text-lg font-semibold mt-1 ${pnlColor(closed.data.totalPremium)}`}
                      >
                        {signedMoney(closed.data.totalPremium)}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <Text className="text-[10px] uppercase tracking-wide text-slate-500">
                        Avg % P/L
                      </Text>
                      <Text className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                        {closed.data.avgPercentPL != null
                          ? `${closed.data.avgPercentPL.toFixed(1)}%`
                          : "—"}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Text className="text-xs uppercase tracking-wide text-slate-500">
                  Last 30 days ({closed.data.total})
                </Text>
                {closed.data.items.length === 0 ? (
                  <EmptyState message="No closed trades or lots in the last 30 days." />
                ) : (
                  <View className="gap-2">
                    {closed.data.items.map((item) => (
                      <ClosedRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                      />
                    ))}
                  </View>
                )}
                <Text className="text-xs text-slate-500 text-center mt-2">
                  Full history on the web app
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
