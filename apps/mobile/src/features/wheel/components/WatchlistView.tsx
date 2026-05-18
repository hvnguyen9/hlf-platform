import { ActivityIndicator, Text, View } from "react-native";
import { useQuotes, useWatchlist } from "../queries";
import { money, pnlColor, signedMoney } from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";

export function WatchlistView() {
  const watchlist = useWatchlist();
  const manual = watchlist.data?.manual ?? [];
  const positionTickers = watchlist.data?.positions.map((p) => p.ticker) ?? [];
  const tickers = Array.from(new Set([...manual, ...positionTickers]));
  const quotes = useQuotes(tickers);

  if (watchlist.isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (watchlist.error) return <QueryError error={watchlist.error} />;
  if (tickers.length === 0) {
    return (
      <EmptyState message="Watchlist is empty. Add tickers from the web app for now." />
    );
  }

  return (
    <View className="gap-2">
      {tickers.map((ticker) => {
        const quote = quotes.data?.[ticker];
        const change = quote?.change ?? null;
        const changePct = quote?.changePct ?? null;
        const position = watchlist.data?.positions.find((p) => p.ticker === ticker);
        const isManual = manual.includes(ticker);
        const tradeCount = position?.trades.length ?? 0;
        const shareTotal =
          position?.stockLots.reduce((s, l) => s + l.shares, 0) ?? 0;
        return (
          <View
            key={ticker}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <View className="flex-row items-baseline justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-base font-semibold text-white">
                  {ticker}
                </Text>
                {isManual ? (
                  <Text className="text-[10px] uppercase tracking-wider text-slate-500">
                    watch
                  </Text>
                ) : null}
              </View>
              <Text className="text-sm text-slate-300">
                {quote?.price != null ? money(quote.price) : "—"}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-slate-500">
                {tradeCount > 0
                  ? `${tradeCount} open trade${tradeCount > 1 ? "s" : ""}`
                  : "no trades"}
                {shareTotal > 0 ? ` · ${shareTotal} sh` : ""}
              </Text>
              {change != null && changePct != null ? (
                <Text className={`text-xs font-medium ${pnlColor(change)}`}>
                  {signedMoney(change)} ({changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(2)}%)
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
