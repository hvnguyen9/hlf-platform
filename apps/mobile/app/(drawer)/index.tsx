import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, type Href } from "expo-router";
import { AlertTriangle, Bell, TrendingDown } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { usePortalSummary } from "@/features/dashboard/usePortalSummary";
import { KpiGridSkeleton } from "@/features/wheel/components/Skeleton";
import type { TodayItem } from "@/features/dashboard/types";

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
      <Text
        className={`text-2xl font-semibold mt-1 ${valueClass ?? "text-slate-900 dark:text-white"}`}
      >
        {value}
      </Text>
      {sub ? <Text className="text-xs text-slate-500 mt-1">{sub}</Text> : null}
    </View>
  );
}

// Severity → border + icon-bg color.
const SEVERITY_BORDER: Record<TodayItem["severity"], string> = {
  high: "border-rose-300 dark:border-rose-900/60",
  medium: "border-amber-300 dark:border-amber-900/60",
  low: "border-slate-200 dark:border-slate-800",
};
const SEVERITY_ICON_BG: Record<TodayItem["severity"], string> = {
  high: "bg-rose-100 dark:bg-rose-500/20",
  medium: "bg-amber-100 dark:bg-amber-500/20",
  low: "bg-slate-200 dark:bg-slate-800",
};
const SEVERITY_ICON_COLOR: Record<TodayItem["severity"], string> = {
  high: "#e11d48",
  medium: "#d97706",
  low: "#64748b",
};

function TodayKindIcon({ item }: { item: TodayItem }) {
  const color = SEVERITY_ICON_COLOR[item.severity];
  if (item.kind === "ALERT") return <Bell color={color} size={16} />;
  if (item.kind === "EXPIRING")
    return <AlertTriangle color={color} size={16} />;
  return <TrendingDown color={color} size={16} />;
}

// Translate a portal-summary actionUrl (which points at the web app)
// to a mobile in-app route. Falls back to /wheel if we can't pattern-
// match — better than dead-end-tapping a card. Cast to Href since
// expo-router's typed routes don't know about our runtime-derived
// strings.
function mobileRouteFor(item: TodayItem): Href {
  const u = item.actionUrl;
  const tradeMatch = u.match(/\/trades\/([^/?#]+)/);
  if (tradeMatch) return `/wheel/trade/${tradeMatch[1]}` as Href;
  if (u.includes("/watchlist")) return "/wheel/watchlist" as Href;
  if (u.includes("/alerts")) return "/wheel/alerts" as Href;
  // budget-tracker categories — no mobile equivalent; deflect to /wheel
  return "/wheel" as Href;
}

function TodayRow({ item }: { item: TodayItem }) {
  return (
    <Pressable
      onPress={() => router.push(mobileRouteFor(item))}
      className={`rounded-xl border ${SEVERITY_BORDER[item.severity]} bg-white dark:bg-slate-900 p-3 active:bg-slate-100 dark:active:bg-slate-800/60`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`mt-0.5 rounded-full p-1.5 ${SEVERITY_ICON_BG[item.severity]}`}
        >
          <TodayKindIcon item={item} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">
              {item.title}
            </Text>
            {item.ticker ? (
              <Text className="text-[10px] uppercase tracking-wider text-slate-500">
                {item.ticker}
              </Text>
            ) : null}
          </View>
          <Text className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {item.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch, error } = usePortalSummary();
  const todayItems = data?.todayItems ?? [];

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
          <Text className="text-slate-600 dark:text-slate-400 mt-1">
            Your snapshot.
          </Text>
        </View>

        {isLoading ? (
          <KpiGridSkeleton count={4} />
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

            <View>
              <View className="flex-row items-baseline justify-between mb-2">
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Today
                </Text>
                <Text className="text-xs text-slate-500">
                  {todayItems.length}
                  {todayItems.length === 1 ? " item" : " items"}
                </Text>
              </View>
              {todayItems.length === 0 ? (
                <View className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 p-4">
                  <Text className="text-sm text-slate-500">
                    All quiet. No alerts, expirations, or budget breaches.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {todayItems.slice(0, 10).map((item) => (
                    <TodayRow key={item.id} item={item} />
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
