import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenTrades, usePortfolios } from "../queries";
import { dte, money, shortDate, tradeTypeLabel } from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";

export function TradesView() {
  const trades = useOpenTrades();
  const portfolios = usePortfolios();

  const portfolioName = (id: string): string =>
    portfolios.data?.find((p) => p.id === id)?.name ?? "Unknown";

  if (trades.isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (trades.error) return <QueryError error={trades.error} />;
  if (!trades.data || trades.data.length === 0) {
    return <EmptyState message="No open trades. Sell a CSP to get started." />;
  }

  return (
    <View className="gap-2">
      {trades.data.map((t) => {
        const days = dte(t.expirationDate);
        const dteColor =
          days < 0
            ? "text-rose-400"
            : days <= 7
              ? "text-amber-400"
              : "text-slate-400";
        return (
          <Pressable
            key={t.id}
            onPress={() => router.push(`/wheel/trade/${t.id}`)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 active:bg-slate-800/80"
          >
            <View className="flex-row items-baseline justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-base font-semibold text-white">
                  {t.ticker}
                </Text>
                <Text className="text-xs font-medium text-emerald-300">
                  {tradeTypeLabel(t.type)}
                </Text>
              </View>
              <Text className="text-sm text-slate-300">
                {money(t.contractPrice * t.contractsOpen * 100)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500">
                ${t.strikePrice} · exp {shortDate(t.expirationDate)} ·{" "}
                {t.contractsOpen}x @ ${t.contractPrice.toFixed(2)}
              </Text>
              <Text className={`text-xs font-medium ${dteColor}`}>
                {days < 0 ? `${Math.abs(days)}d past` : `${days}d`}
              </Text>
            </View>
            <Text className="text-xs text-slate-600 mt-1">
              {portfolioName(t.portfolioId)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
