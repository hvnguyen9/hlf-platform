import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useJournal } from "@/features/wheel/queries";
import {
  money,
  monthLabel,
  pnlColor,
  shortDate,
  signedMoney,
  tradeTypeLabel,
  yearMonthOf,
} from "@/features/wheel/format";
import { QueryError } from "@/features/wheel/components/QueryError";

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return yearMonthOf(d);
}

function StatCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <Text className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className={`text-lg font-semibold mt-1 ${valueClass ?? "text-white"}`}>
        {value}
      </Text>
      {sub ? <Text className="text-[10px] text-slate-500 mt-1">{sub}</Text> : null}
    </View>
  );
}

export default function JournalScreen() {
  const [yearMonth, setYearMonth] = useState(() => yearMonthOf(new Date()));
  const journal = useJournal(yearMonth);

  const days = journal.data
    ? Object.entries(journal.data.days)
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .filter(([, d]) => d.tradeCount > 0)
    : [];

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4 gap-4">
        <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
          <Pressable
            onPress={() => setYearMonth(shiftMonth(yearMonth, -1))}
            className="p-2 active:opacity-60"
          >
            <ChevronLeft color="#94a3b8" size={20} />
          </Pressable>
          <Text className="text-base font-semibold text-white">
            {monthLabel(yearMonth)}
          </Text>
          <Pressable
            onPress={() => setYearMonth(shiftMonth(yearMonth, 1))}
            className="p-2 active:opacity-60"
          >
            <ChevronRight color="#94a3b8" size={20} />
          </Pressable>
        </View>

        {journal.isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : journal.error ? (
          <QueryError error={journal.error} />
        ) : journal.data ? (
          <>
            <View className="flex-row gap-3">
              <StatCard
                label="Total"
                value={signedMoney(journal.data.monthStats.totalPnl)}
                valueClass={pnlColor(journal.data.monthStats.totalPnl)}
                sub={`${journal.data.monthStats.tradeCount} trades`}
              />
              <StatCard
                label="Win rate"
                value={
                  journal.data.monthStats.winRate != null
                    ? `${(journal.data.monthStats.winRate * 100).toFixed(0)}%`
                    : "—"
                }
              />
            </View>
            <View className="flex-row gap-3">
              <StatCard
                label="Best day"
                value={
                  journal.data.monthStats.bestDay
                    ? signedMoney(journal.data.monthStats.bestDay.pnl)
                    : "—"
                }
                valueClass={pnlColor(journal.data.monthStats.bestDay?.pnl ?? 0)}
                sub={
                  journal.data.monthStats.bestDay
                    ? shortDate(journal.data.monthStats.bestDay.date)
                    : undefined
                }
              />
              <StatCard
                label="Worst day"
                value={
                  journal.data.monthStats.worstDay
                    ? signedMoney(journal.data.monthStats.worstDay.pnl)
                    : "—"
                }
                valueClass={pnlColor(journal.data.monthStats.worstDay?.pnl ?? 0)}
                sub={
                  journal.data.monthStats.worstDay
                    ? shortDate(journal.data.monthStats.worstDay.date)
                    : undefined
                }
              />
            </View>

            {journal.data.notes ? (
              <View className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <Text className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                  Notes
                </Text>
                <Text className="text-sm text-slate-200">
                  {journal.data.notes}
                </Text>
              </View>
            ) : null}

            <View>
              <Text className="text-sm font-semibold text-slate-300 mb-2">
                Days with activity
              </Text>
              {days.length === 0 ? (
                <View className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 items-center">
                  <Text className="text-sm text-slate-500">
                    No trades closed this month.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {days.map(([date, day]) => (
                    <View
                      key={date}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                    >
                      <View className="flex-row items-baseline justify-between">
                        <Text className="text-sm font-medium text-slate-200">
                          {shortDate(date)}
                        </Text>
                        <Text
                          className={`text-sm font-semibold ${pnlColor(day.pnl)}`}
                        >
                          {signedMoney(day.pnl)}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-500 mt-1">
                        {day.tradeCount} trade{day.tradeCount > 1 ? "s" : ""} ·{" "}
                        {day.trades
                          .map((t) => `${t.ticker} ${tradeTypeLabel(t.type)}`)
                          .join(", ")}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
