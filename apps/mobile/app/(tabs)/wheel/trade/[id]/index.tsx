import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { usePortfolios, useTrade } from "@/features/wheel/queries";
import {
  dte,
  money,
  pnlColor,
  shortDate,
  signedMoney,
  tradeTypeLabel,
} from "@/features/wheel/format";
import { QueryError } from "@/features/wheel/components/QueryError";

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <View className="flex-row items-baseline justify-between py-2 border-b border-slate-800/60">
      <Text className="text-xs uppercase tracking-wide text-slate-500">{label}</Text>
      <Text className={`text-sm ${valueClass ?? "text-slate-200"}`}>{value}</Text>
    </View>
  );
}

export default function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trade = useTrade(id);
  const portfolios = usePortfolios();

  if (trade.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (trade.error) {
    return (
      <View className="flex-1 bg-slate-950 p-4">
        <QueryError error={trade.error} />
      </View>
    );
  }
  if (!trade.data) return null;
  const t = trade.data;
  const days = dte(t.expirationDate);
  const isOpen = t.status === "open";
  const realized = t.premiumCaptured ?? null;
  const portfolioName =
    portfolios.data?.find((p) => p.id === t.portfolioId)?.name ?? "Unknown";

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4 gap-4">
        <View>
          <View className="flex-row items-baseline gap-3">
            <Text className="text-3xl font-bold text-white">{t.ticker}</Text>
            <Text className="text-sm font-medium text-emerald-300">
              {tradeTypeLabel(t.type)}
            </Text>
          </View>
          <Text className="text-sm text-slate-400 mt-1">
            {portfolioName} ·{" "}
            <Text className={isOpen ? "text-emerald-300" : "text-slate-500"}>
              {isOpen ? "OPEN" : t.closeReason ?? "CLOSED"}
            </Text>
          </Text>
        </View>

        <View className="rounded-xl border border-slate-800 bg-slate-900 px-4">
          <Row label="Strike" value={`$${t.strikePrice}`} />
          <Row label="Expiration" value={shortDate(t.expirationDate)} />
          {isOpen ? (
            <Row
              label="DTE"
              value={days < 0 ? `${Math.abs(days)}d past` : `${days}d`}
              valueClass={
                days < 0
                  ? "text-rose-400"
                  : days <= 7
                    ? "text-amber-400"
                    : "text-slate-200"
              }
            />
          ) : null}
          <Row
            label="Contracts"
            value={`${t.contractsOpen}/${t.contractsInitial}`}
          />
          <Row
            label="Contract price"
            value={`$${t.contractPrice.toFixed(2)}`}
          />
          {t.entryPrice != null ? (
            <Row label="Underlying entry" value={`$${t.entryPrice.toFixed(2)}`} />
          ) : null}
          <Row
            label="Premium captured"
            value={money(t.contractPrice * t.contractsOpen * 100)}
          />
        </View>

        {!isOpen ? (
          <View className="rounded-xl border border-slate-800 bg-slate-900 px-4">
            {t.closingPrice != null ? (
              <Row
                label="Closing price"
                value={`$${t.closingPrice.toFixed(2)}`}
              />
            ) : null}
            {realized != null ? (
              <Row
                label="Realized"
                value={signedMoney(realized)}
                valueClass={pnlColor(realized)}
              />
            ) : null}
            {t.percentPL != null ? (
              <Row label="% P/L" value={`${t.percentPL.toFixed(2)}%`} />
            ) : null}
            {t.closedAt ? (
              <Row label="Closed" value={shortDate(t.closedAt)} />
            ) : null}
          </View>
        ) : null}

        {isOpen ? (
          <Pressable
            onPress={() => router.push(`/wheel/trade/${t.id}/close`)}
            className="rounded-xl bg-emerald-500 py-3 active:bg-emerald-600"
          >
            <Text className="text-center font-semibold text-white">
              Close trade
            </Text>
          </Pressable>
        ) : null}

        {t.stockLotId ? (
          <Pressable
            onPress={() => router.push(`/wheel/lot/${t.stockLotId}`)}
            className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 active:bg-emerald-950/50"
          >
            <Text className="text-emerald-300 text-sm font-medium">
              View linked stock lot →
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
