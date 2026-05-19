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
  return "text-slate-700 dark:text-slate-300";
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
    <View className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <Text className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      <Text className={`text-2xl font-semibold mt-1 ${valueClass ?? "text-slate-900 dark:text-white"}`}>
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
    <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-3">
      <Text className="text-sm text-slate-800 dark:text-slate-200">{alert.message}</Text>
      <Text className="text-xs text-slate-500 mt-1">{when}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch, error } = usePortalSummary();

  return (
    <ScrollView
      className="flex-1 bg-slate-100 dark:bg-slate-950"
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
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Hi, {user?.firstName ?? "there"}
          </Text>
          <Text className="text-slate-600 dark:text-slate-400 mt-1">Your snapshot.</Text>
        </View>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#10b981" />
          </View>
        ) : error ? (
          <View className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-100 dark:bg-rose-950/40 p-4">
            <Text className="text-rose-700 dark:text-rose-300 font-medium">
              Couldn't load summary
            </Text>
            <Text className="text-rose-700/80 dark:text-rose-400/80 text-sm mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </Text>
          </View>
        ) : data ? (
          <>
            {/*
              Four headline KPIs for the MTD month:
              - Total P&L: realized trading P&L from wheel-tracker
              - Business expenses: bookkeeping mtdExpenses
              - Personal expenses: budget-tracker mtdSpent
              - Net: bookkeeping.mtdNet (which already nets income incl.
                trading P&L vs. business expenses) minus personal spending.
                Equivalent to total cash flow this month.
            */}
            {(() => {
              const tradingPnl = data.wheel?.mtdRealizedPnl ?? null;
              const businessExp = data.bookkeeping?.mtdExpenses ?? null;
              const personalExp = data.budget?.mtdSpent ?? null;
              const net =
                data.bookkeeping && data.budget
                  ? data.bookkeeping.mtdNet - data.budget.mtdSpent
                  : null;
              return (
                <>
                  <View className="flex-row gap-3">
                    <KpiCard
                      label="Total P&L (MTD)"
                      value={tradingPnl != null ? signed(tradingPnl) : "—"}
                      valueClass={
                        tradingPnl != null ? pnlColor(tradingPnl) : undefined
                      }
                      sub={
                        data.wheel
                          ? `YTD ${signed(data.wheel.ytdRealizedPnl)}`
                          : data.errors.wheel ?? "offline"
                      }
                    />
                    <KpiCard
                      label="Business exp."
                      value={
                        businessExp != null
                          ? currency.format(businessExp)
                          : "—"
                      }
                      valueClass={
                        businessExp != null && businessExp > 0
                          ? "text-rose-400"
                          : undefined
                      }
                      sub={
                        data.bookkeeping
                          ? `income ${currency.format(data.bookkeeping.mtdIncome)}`
                          : data.errors.bookkeeping ?? "offline"
                      }
                    />
                  </View>
                  <View className="flex-row gap-3">
                    <KpiCard
                      label="Personal exp."
                      value={
                        personalExp != null
                          ? currency.format(personalExp)
                          : "—"
                      }
                      valueClass={
                        personalExp != null && personalExp > 0
                          ? "text-rose-400"
                          : undefined
                      }
                      sub={
                        data.budget
                          ? `of ${currency.format(data.budget.monthlyBudgetTotal)}`
                          : data.errors.budget ?? "offline"
                      }
                    />
                    <KpiCard
                      label="Net"
                      value={net != null ? signed(net) : "—"}
                      valueClass={net != null ? pnlColor(net) : undefined}
                      sub="P&L − business − personal"
                    />
                  </View>
                </>
              );
            })()}

            {data.wheel ? (
              <View>
                <View className="flex-row items-baseline justify-between mb-2">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                  <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 p-4">
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
