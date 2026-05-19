import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useOpenTrades } from "../queries";
import { dte, dteLabel, shortDate } from "../format";
import { TypeBadge } from "./TypeBadge";

const URGENCY_DAYS = 7;

export function ExpiringSoon() {
  const trades = useOpenTrades();
  const expiring =
    trades.data
      ?.map((t) => ({ trade: t, days: dte(t.expirationDate) }))
      .filter(({ days }) => days <= URGENCY_DAYS)
      .sort((a, b) => a.days - b.days) ?? [];

  if (expiring.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-baseline justify-between mb-2">
        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Expiring soon
        </Text>
        <Text className="text-xs text-slate-500">
          next {URGENCY_DAYS} days · {expiring.length}
        </Text>
      </View>
      <View className="gap-2">
        {expiring.slice(0, 5).map(({ trade: t, days }) => {
          const color =
            days < 0
              ? "text-rose-400"
              : days <= 2
                ? "text-amber-400"
                : "text-slate-700 dark:text-slate-300";
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
                <Text className={`text-xs font-medium ${color}`}>
                  {dteLabel(t.expirationDate)}
                </Text>
              </View>
              <Text className="text-xs text-slate-500 mt-1">
                ${t.strikePrice} · exp {shortDate(t.expirationDate)} ·{" "}
                {t.contractsOpen}x
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
