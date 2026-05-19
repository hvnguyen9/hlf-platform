import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenTrades, usePortfolios, useQuotes } from "../queries";
import {
  dte,
  dteColor,
  dteLabel,
  money,
  otmPercent,
  shortDate,
} from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";
import { RowSkeletonList } from "./Skeleton";
import { TypeBadge } from "./TypeBadge";

export function TradesView({ portfolioId }: { portfolioId?: string | null }) {
  const trades = useOpenTrades();
  const portfolios = usePortfolios();

  const filtered = portfolioId
    ? trades.data?.filter((t) => t.portfolioId === portfolioId)
    : trades.data;

  // Dedup tickers for the quotes fetch — same ticker across multiple
  // trades pays one network call.
  const tickers = Array.from(new Set(filtered?.map((t) => t.ticker) ?? []));
  const quotes = useQuotes(tickers);

  const portfolioName = (id: string): string =>
    portfolios.data?.find((p) => p.id === id)?.name ?? "Unknown";

  if (trades.isLoading) return <RowSkeletonList count={3} />;
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
        const dColor = dteColor(days);
        const price = quotes.data?.[t.ticker]?.price ?? null;
        const otm = otmPercent(t.type, t.strikePrice, price);
        const isITM = otm != null && otm < 0;
        const moneynessColor =
          otm == null
            ? "text-slate-500"
            : isITM
              ? "text-rose-500"
              : "text-emerald-500";
        const openPremium = t.contractPrice * t.contractsOpen * 100;
        return (
          <Pressable
            key={t.id}
            onPress={() => router.push(`/wheel/trade/${t.id}`)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 active:bg-slate-300/80 dark:active:bg-slate-800/80"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-slate-900 dark:text-white">
                  {t.ticker}
                </Text>
                <TypeBadge type={t.type} />
              </View>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-sm text-slate-700 dark:text-slate-300">
                  {price != null ? money(price) : "—"}
                </Text>
                {otm != null ? (
                  <Text className={`text-xs font-medium ${moneynessColor}`}>
                    {isITM ? "ITM " : ""}
                    {Math.abs(otm).toFixed(1)}%
                    {!isITM ? " OTM" : ""}
                  </Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500">
                ${t.strikePrice} · {t.contractsOpen}x @ $
                {t.contractPrice.toFixed(2)} · {money(openPremium)}
              </Text>
              <Text className={`text-xs font-medium ${dColor}`}>
                {dteLabel(t.expirationDate)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500 dark:text-slate-600">
                {portfolioName(t.portfolioId)}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-600">
                exp {shortDate(t.expirationDate)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
