import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { usePortalSummary } from "@/features/dashboard/usePortalSummary";
import type { RecentAlert } from "@/features/dashboard/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function signed(value: number): string {
  const formatted = currency.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-slate-300";
}

function KpiCard({
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
    <View className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className={`text-2xl font-semibold mt-1 ${valueClass ?? "text-white"}`}>
        {value}
      </Text>
      {sub ? <Text className="text-xs text-slate-500 mt-1">{sub}</Text> : null}
    </View>
  );
}

function AlertRow({ alert }: { alert: RecentAlert }) {
  const when = new Date(alert.firedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <View className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <Text className="text-sm text-slate-200">{alert.message}</Text>
      <Text className="text-xs text-slate-500 mt-1">{when}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch, error } = usePortalSummary();

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => refetch()}
          tintColor="#10b981"
        />
      }
    >
      <View className="p-4 gap-4">
        <View>
          <Text className="text-2xl font-bold text-white">
            Hi, {user?.firstName ?? "there"}
          </Text>
          <Text className="text-slate-400 mt-1">Your HLF snapshot.</Text>
        </View>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : error ? (
          <View className="rounded-xl border border-rose-900 bg-rose-950/40 p-4">
            <Text className="text-rose-300 font-medium">
              Couldn't load summary
            </Text>
            <Text className="text-rose-400/80 text-sm mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </Text>
          </View>
        ) : data ? (
          <>
            <View className="flex-row gap-3">
              <KpiCard
                label="Open positions"
                value={String(data.wheel?.openTradeCount ?? "—")}
                sub={
                  data.wheel
                    ? `${data.wheel.openLotCount} stock lots`
                    : data.errors.wheel ?? "offline"
                }
              />
              <KpiCard
                label="MTD trading"
                value={
                  data.wheel ? signed(data.wheel.mtdRealizedPnl) : "—"
                }
                valueClass={
                  data.wheel ? pnlColor(data.wheel.mtdRealizedPnl) : undefined
                }
                sub={
                  data.wheel
                    ? `YTD ${signed(data.wheel.ytdRealizedPnl)}`
                    : data.errors.wheel ?? "offline"
                }
              />
            </View>

            <View className="flex-row gap-3">
              <KpiCard
                label="MTD net"
                value={
                  data.bookkeeping ? signed(data.bookkeeping.mtdNet) : "—"
                }
                valueClass={
                  data.bookkeeping
                    ? pnlColor(data.bookkeeping.mtdNet)
                    : undefined
                }
                sub={
                  data.bookkeeping
                    ? `YTD ${signed(data.bookkeeping.ytdNet)}`
                    : data.errors.bookkeeping ?? "offline"
                }
              />
              <KpiCard
                label="Budget left"
                value={
                  data.budget ? currency.format(data.budget.remaining) : "—"
                }
                sub={
                  data.budget
                    ? data.budget.fireScorePct != null
                      ? `FIRE ${data.budget.fireScorePct.toFixed(1)}%`
                      : "no FIRE goal set"
                    : data.errors.budget ?? "offline"
                }
              />
            </View>

            {data.wheel ? (
              <View>
                <View className="flex-row items-baseline justify-between mb-2">
                  <Text className="text-sm font-semibold text-slate-300">
                    Alerts
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {data.wheel.alertsToday} today ·{" "}
                    {data.wheel.alertsThisWeek} this week
                  </Text>
                </View>
                {data.wheel.recentAlerts.length > 0 ? (
                  <View className="gap-2">
                    {data.wheel.recentAlerts.slice(0, 5).map((alert) => (
                      <AlertRow key={alert.id} alert={alert} />
                    ))}
                  </View>
                ) : (
                  <View className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <Text className="text-sm text-slate-500">
                      No recent alerts.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
