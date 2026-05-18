import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useStockLot, usePortfolios, useQuotes } from "@/features/wheel/queries";
import { money, pnlColor, shortDate, signedMoney, tradeTypeLabel } from "@/features/wheel/format";
import { QueryError } from "@/features/wheel/components/QueryError";

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <View className="flex-row items-baseline justify-between py-2 border-b border-slate-800/60">
      <Text className="text-xs uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className={`text-sm ${valueClass ?? "text-slate-200"}`}>{value}</Text>
    </View>
  );
}

export default function LotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lot = useStockLot(id);
  const portfolios = usePortfolios();
  const data = lot.data;
  const ticker = data?.ticker;
  const quotes = useQuotes(ticker ? [ticker] : []);

  if (lot.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (lot.error) {
    return (
      <View className="flex-1 bg-slate-950 p-4">
        <QueryError error={lot.error} />
      </View>
    );
  }
  if (!data) return null;

  const basis = data.avgCost * data.shares;
  const currentPrice = ticker ? quotes.data?.[ticker]?.price ?? null : null;
  const unrealized =
    currentPrice != null ? (currentPrice - data.avgCost) * data.shares : null;
  const portfolioName =
    portfolios.data?.find((p) => p.id === data.portfolioId)?.name ?? "Unknown";

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4 gap-4">
        <View>
          <Text className="text-3xl font-bold text-white">{data.ticker}</Text>
          <Text className="text-sm text-slate-400 mt-1">
            {portfolioName} ·{" "}
            <Text className={data.status === "OPEN" ? "text-emerald-300" : "text-slate-500"}>
              {data.status}
            </Text>
          </Text>
        </View>

        <View className="rounded-xl border border-slate-800 bg-slate-900 px-4">
          <Row label="Shares" value={String(data.shares)} />
          <Row label="Avg cost" value={`$${data.avgCost.toFixed(2)}`} />
          <Row label="Cost basis" value={money(basis)} />
          {currentPrice != null ? (
            <Row label="Current price" value={money(currentPrice)} />
          ) : null}
          {unrealized != null ? (
            <Row
              label="Unrealized P/L"
              value={signedMoney(unrealized)}
              valueClass={pnlColor(unrealized)}
            />
          ) : null}
          <Row label="Opened" value={shortDate(data.openedAt)} />
          {data.closedAt ? <Row label="Closed" value={shortDate(data.closedAt)} /> : null}
          {data.realizedPnl != null ? (
            <Row
              label="Realized"
              value={signedMoney(data.realizedPnl)}
              valueClass={pnlColor(data.realizedPnl)}
            />
          ) : null}
        </View>

        {data.status === "OPEN" ? (
          <View className="gap-2">
            <Pressable
              onPress={() => router.push(`/wheel/lot/${data.id}/sell`)}
              className="rounded-xl bg-emerald-500 py-3 active:bg-emerald-600"
            >
              <Text className="text-center font-semibold text-white">
                Sell shares
              </Text>
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => router.push(`/wheel/lot/${data.id}/add`)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-3 active:bg-slate-800"
              >
                <Text className="text-center font-medium text-slate-200">
                  Add shares
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/wheel/lot/${data.id}/notes`)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-3 active:bg-slate-800"
              >
                <Text className="text-center font-medium text-slate-200">
                  Edit notes
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push(`/wheel/lot/${data.id}/notes`)}
            className="rounded-xl border border-slate-700 bg-slate-900 py-3 active:bg-slate-800"
          >
            <Text className="text-center font-medium text-slate-200">
              Edit notes
            </Text>
          </Pressable>
        )}

        {data.trades && data.trades.length > 0 ? (
          <View>
            <Text className="text-sm font-semibold text-slate-300 mb-2">
              Linked trades ({data.trades.length})
            </Text>
            <View className="gap-2">
              {data.trades.map((t) => (
                <View
                  key={t.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-sm text-slate-200">
                      {tradeTypeLabel(t.type)} · ${t.strikePrice}
                    </Text>
                    <Text
                      className={
                        t.status === "open" ? "text-emerald-300 text-xs" : "text-slate-500 text-xs"
                      }
                    >
                      {t.status}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-500 mt-1">
                    {t.contractsOpen}/{t.contractsInitial}x @ ${t.contractPrice.toFixed(2)} · exp{" "}
                    {shortDate(t.expirationDate)}
                  </Text>
                  {t.premiumCaptured != null ? (
                    <Text
                      className={`text-xs mt-1 ${pnlColor(t.premiumCaptured)}`}
                    >
                      Realized {signedMoney(t.premiumCaptured)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {data.notes ? (
          <View className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Notes
            </Text>
            <Text className="text-sm text-slate-200">{data.notes}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
