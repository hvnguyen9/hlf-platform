import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Bell, Plus, Trash2 } from "lucide-react-native";
import { router } from "expo-router";
import { useQuotes, useWatchlist } from "../queries";
import { useAddWatchTicker, useRemoveWatchTicker } from "../mutations";
import { money, pnlColor, signedMoney } from "../format";
import { EmptyState } from "./EmptyState";
import { QueryError } from "./QueryError";

export function WatchlistView() {
  const watchlist = useWatchlist();
  const addTicker = useAddWatchTicker();
  const removeTicker = useRemoveWatchTicker();
  const [pending, setPending] = useState("");
  const [error, setError] = useState<string | null>(null);

  const manual = watchlist.data?.manual ?? [];
  const positionTickers = watchlist.data?.positions.map((p) => p.ticker) ?? [];
  const tickers = Array.from(new Set([...manual, ...positionTickers]));
  const quotes = useQuotes(tickers);

  async function handleAdd() {
    const clean = pending.trim().toUpperCase();
    if (!clean) return;
    setError(null);
    try {
      await addTicker.mutateAsync(clean);
      setPending("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  function handleRemove(ticker: string) {
    Alert.alert(
      `Remove ${ticker}?`,
      "It will leave your manual watchlist (position-derived tickers stay).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void removeTicker.mutate(ticker);
          },
        },
      ],
    );
  }

  if (watchlist.isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (watchlist.error) return <QueryError error={watchlist.error} />;

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <TextInput
          value={pending}
          onChangeText={setPending}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Add ticker"
          placeholderTextColor="#475569"
          onSubmitEditing={handleAdd}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
        <Pressable
          onPress={handleAdd}
          disabled={!pending.trim() || addTicker.isPending}
          className="rounded-lg bg-emerald-500 px-3 py-2 active:bg-emerald-600 disabled:opacity-60"
        >
          {addTicker.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Plus color="white" size={20} />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text className="text-xs text-rose-400">{error}</Text>
      ) : null}

      {tickers.length === 0 ? (
        <EmptyState message="Watchlist is empty. Add a ticker above." />
      ) : (
        tickers.map((ticker) => {
          const quote = quotes.data?.[ticker];
          const change = quote?.change ?? null;
          const changePct = quote?.changePct ?? null;
          const position = watchlist.data?.positions.find(
            (p) => p.ticker === ticker,
          );
          const isManual = manual.includes(ticker);
          const tradeCount = position?.trades.length ?? 0;
          const shareTotal =
            position?.stockLots.reduce((s, l) => s + l.shares, 0) ?? 0;
          return (
            <View
              key={ticker}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <View className="flex-row items-start">
                <View className="flex-1">
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
                  <Text className="text-xs text-slate-500 mt-1">
                    {tradeCount > 0
                      ? `${tradeCount} open trade${tradeCount > 1 ? "s" : ""}`
                      : "no trades"}
                    {shareTotal > 0 ? ` · ${shareTotal} sh` : ""}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-slate-300">
                    {quote?.price != null ? money(quote.price) : "—"}
                  </Text>
                  {change != null && changePct != null ? (
                    <Text className={`text-xs font-medium ${pnlColor(change)}`}>
                      {signedMoney(change)} ({changePct >= 0 ? "+" : ""}
                      {changePct.toFixed(2)}%)
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() =>
                    router.push(
                      `/wheel/alerts/new?ticker=${encodeURIComponent(ticker)}`,
                    )
                  }
                  className="ml-3 p-1 active:opacity-60"
                  hitSlop={8}
                >
                  <Bell color="#64748b" size={18} />
                </Pressable>
                {isManual ? (
                  <Pressable
                    onPress={() => handleRemove(ticker)}
                    className="ml-2 p-1 active:opacity-60"
                    hitSlop={8}
                  >
                    <Trash2 color="#64748b" size={18} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
