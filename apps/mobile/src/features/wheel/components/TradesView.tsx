import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenTrades, usePortfolios } from "../queries";
import { dte, money, shortDate } from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";
import { TypeBadge } from "./TypeBadge";

export function TradesView({ portfolioId }: { portfolioId?: string | null }) {
  const trades = useOpenTrades();
  const portfolios = usePortfolios();

  const portfolioName = (id: string): string =>
    portfolios.data?.find((p) => p.id === id)?.name ?? "Unknown";

  const filtered = portfolioId
    ? trades.data?.filter((t) => t.portfolioId === portfolioId)
    : trades.data;

  if (trades.isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (trades.error) return <QueryError error={trades.error} />;
  if (!filtered || filtered.length === 0) {
    return (
      <EmptyState
        message={
          portfolioId
            ? "No open trades in this portfolio."
            : "No open trades. Sell a CSP to get started."
        }
      />
    );
  }

  return (
    <View className="gap-2">
      {filtered.map((t) => {
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
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-white">
                  {t.ticker}
                </Text>
                <TypeBadge type={t.type} />
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
