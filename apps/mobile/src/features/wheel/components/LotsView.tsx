import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenStockLots, usePortfolios, useQuotes } from "../queries";
import { money, pnlColor, shortDate, signedMoney } from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";
import { RowSkeletonList } from "./Skeleton";

export function LotsView({ portfolioId }: { portfolioId?: string | null }) {
  const lots = useOpenStockLots();
  const portfolios = usePortfolios();
  const filtered = portfolioId
    ? lots.data?.filter((l) => l.portfolioId === portfolioId)
    : lots.data;
  const tickers = Array.from(new Set(filtered?.map((l) => l.ticker) ?? []));
  const quotes = useQuotes(tickers);

  const portfolioName = (id: string): string =>
    portfolios.data?.find((p) => p.id === id)?.name ?? "Unknown";

  if (lots.isLoading) {
    return <RowSkeletonList count={3} />;
  }
  if (lots.error) return <QueryError error={lots.error} />;
  if (!filtered || filtered.length === 0) {
    return (
      <EmptyState
        message={
          portfolioId
            ? "No open stock lots in this portfolio."
            : "No open stock lots. Lots are created when CSPs get assigned."
        }
      />
    );
  }

  return (
    <View className="gap-2">
      {filtered.map((lot) => {
        const quote = quotes.data?.[lot.ticker];
        const currentPrice = quote?.price ?? null;
        const unrealizedPnl =
          currentPrice != null
            ? (currentPrice - lot.avgCost) * lot.shares
            : null;
        const basis = lot.avgCost * lot.shares;
        return (
          <Pressable
            key={lot.id}
            onPress={() => router.push(`/wheel/lot/${lot.id}`)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 active:bg-slate-300/80 dark:active:bg-slate-800/80"
          >
            <View className="flex-row items-baseline justify-between">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {lot.ticker}
              </Text>
              <Text className="text-sm text-slate-700 dark:text-slate-300">
                {lot.shares} sh
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500">
                avg ${lot.avgCost.toFixed(2)} · basis {money(basis)}
              </Text>
              {unrealizedPnl != null ? (
                <Text className={`text-xs font-medium ${pnlColor(unrealizedPnl)}`}>
                  {signedMoney(unrealizedPnl)}
                </Text>
              ) : (
                <Text className="text-xs text-slate-500 dark:text-slate-600">
                  {quote ? "no quote" : "…"}
                </Text>
              )}
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500 dark:text-slate-600">
                {portfolioName(lot.portfolioId)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-600">
                opened {shortDate(lot.openedAt)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
