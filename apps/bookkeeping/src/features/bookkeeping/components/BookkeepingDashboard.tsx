"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Pencil, Trash2, ArrowUpCircle, ArrowDownCircle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddEntryModal } from "@/features/bookkeeping/components/AddEntryModal";
import { useBookkeeping, useTradingSummary, useTaxReserve } from "@/features/bookkeeping/hooks/useBookkeeping";
import { formatCurrency, formatDate, cn, entryAmount } from "@/lib/utils";
import { estimateTax, SUPPORTED_YEARS } from "@/lib/taxCalc";
import { computeReserveSummary } from "@/lib/taxReserve";
import type { TaxYear } from "@/lib/taxCalc";
import { SE_TAXABLE_CATEGORIES } from "@/types";
import type { BookkeepingEntry } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const START_YEAR = 2025;

function getAvailableYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = START_YEAR; y <= current; y++) years.push(y);
  return years;
}

function getYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function KpiCard({
  label, value, icon: Icon, color, iconBg, sub, loading,
}: {
  label: string; value: string; icon: React.ElementType; color: string; iconBg: string; sub?: string; loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-0.5 w-full ${iconBg}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            {loading ? <Skeleton className="h-7 w-28 mt-1" /> : (
              <p className={`text-2xl font-bold leading-tight ${color}`}>{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ml-3 ${iconBg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryBar({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground truncate max-w-[160px]">{label}</span>
        <span className="font-medium tabular-nums ml-2">{formatCurrency(amount)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BookkeepingDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BookkeepingEntry | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { from, to } = getYearRange(selectedYear);
  const { data: entries = [], isLoading } = useBookkeeping(from, to);
  const { data: trading } = useTradingSummary(from, to);
  const { data: reserveEntries = [] } = useTaxReserve(selectedYear);

  const params = new URLSearchParams({ from, to });
  const swrKey = `/api/bookkeeping?${params.toString()}`;
  const tradingKey = `/api/trading-summary?${params.toString()}`;

  function handleSuccess() { void mutate(swrKey); void mutate(tradingKey); }

  async function handleDelete(entry: BookkeepingEntry) {
    if (!confirm(`Delete "${entry.category}" entry for ${formatCurrency(entry.amount)}?`)) return;
    setDeletingId(entry.id);
    const res = await fetch(`/api/bookkeeping/${entry.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Entry deleted"); void mutate(swrKey); }
    else toast.error("Failed to delete");
    setDeletingId(null);
  }

// ── Aggregates — recurring entries count as amount × 12 ────────────────────
  const { totalIncome, totalExpenses } = useMemo(() => {
    const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + entryAmount(e), 0);
    const expenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + entryAmount(e), 0);
    return { totalIncome: income, totalExpenses: expenses };
  }, [entries]);

  // Net = Trading P&L + other income − expenses
  const tradingPL = trading?.totalPremium ?? 0;
  const netIncome = tradingPL + totalIncome - totalExpenses;

  const currentMonth = new Date().getMonth(); // 0-indexed
  const isCurrentYear = selectedYear === currentYear;

  // ── Quarterly P&L ──────────────────────────────────────────────────────────
  const QUARTERS: Array<{ label: string; range: string; months: number[]; taxDue: string }> = [
    { label: "Q1", range: "Jan – Mar", months: [0, 1, 2], taxDue: "Apr 15" },
    { label: "Q2", range: "Apr – Jun", months: [3, 4, 5], taxDue: "Jun 16" },
    { label: "Q3", range: "Jul – Sep", months: [6, 7, 8], taxDue: "Sep 15" },
    { label: "Q4", range: "Oct – Dec", months: [9, 10, 11], taxDue: "Jan 15" },
  ];

  const quarterlyData = useMemo(() => {
    const currentQuarterIdx = Math.floor(currentMonth / 3);
    const recurringIncomePerQ = entries.filter((e) => e.type === "income" && e.recurring).reduce((s, e) => s + e.amount * 3, 0);
    const recurringExpPerQ = entries.filter((e) => e.type === "expense" && e.recurring).reduce((s, e) => s + e.amount * 3, 0);

    return QUARTERS.map(({ label, range, months, taxDue }, qIdx) => {
      const qEntries = entries.filter((e) => !e.recurring && months.includes(new Date(e.date).getUTCMonth()));
      const income = qEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expenses = qEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const qTradingPL = months.reduce<number>((s, m) => {
        const key = `${selectedYear}-${String(m + 1).padStart(2, "0")}`;
        return s + (trading?.byMonth?.[key] ?? 0);
      }, 0);
      const totalInc = income + recurringIncomePerQ + qTradingPL;
      const totalExp = expenses + recurringExpPerQ;
      return {
        label, range, taxDue,
        income: totalInc, expenses: totalExp, tradingPL: qTradingPL,
        net: totalInc - totalExp,
        isCurrent: isCurrentYear && qIdx === currentQuarterIdx,
        isFuture: isCurrentYear && qIdx > currentQuarterIdx,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, trading, selectedYear, currentMonth, isCurrentYear]);

  // ── YTD Run Rate / Final Year Summary ──────────────────────────────────────
  const ytdRunRate = useMemo(() => {
    if (isCurrentYear) {
      const monthsElapsed = currentMonth + 1;
      const projected = Math.round((netIncome / monthsElapsed) * 12);
      return { isProjection: true, value: projected, monthsElapsed };
    }
    // Past year: show the final net as a completed summary
    return { isProjection: false, value: netIncome, monthsElapsed: 12 };
  }, [netIncome, currentMonth, isCurrentYear]);

  // ── Tax Reserve ─────────────────────────────────────────────────────────────
  const taxReserve = useMemo(() => {
    const taxYear = selectedYear as TaxYear;
    if (!SUPPORTED_YEARS.includes(taxYear)) return null;
    const businessIncome = entries.filter((e) => e.type === "income" && SE_TAXABLE_CATEGORIES.includes(e.category)).reduce((s, e) => s + entryAmount(e), 0);
    const otherInc = entries.filter((e) => e.type === "income" && !SE_TAXABLE_CATEGORIES.includes(e.category)).reduce((s, e) => s + entryAmount(e), 0);
    const bizExpenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + entryAmount(e), 0);
    const result = estimateTax({ year: taxYear, tradingIncome: tradingPL, businessIncome, otherIncome: otherInc, businessExpenses: bizExpenses });
    const reserve = computeReserveSummary({
      year: taxYear,
      target: result.totalEstimatedTax,
      entries: reserveEntries,
    });
    return {
      reserveRate: result.recommendedReserveRate,
      target: result.totalEstimatedTax,
      quarterly: result.quarterlyPayment,
      effectiveRate: result.effectiveTaxRate,
      reserve,
    };
  }, [entries, tradingPL, selectedYear, reserveEntries]);

  // ── Monthly chart ───────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const recurringIncomePerMonth = entries
      .filter((e) => e.type === "income" && e.recurring)
      .reduce((s, e) => s + e.amount, 0);
    const recurringExpensePerMonth = entries
      .filter((e) => e.type === "expense" && e.recurring)
      .reduce((s, e) => s + e.amount, 0);

    return MONTHS.map((name, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const monthEntries = entries.filter((e) => e.date.startsWith(monthKey) && !e.recurring);
      const income = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expenses = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const tradingPL = trading?.byMonth?.[monthKey] ?? 0;
      const isCurrentMonth = selectedYear === new Date().getFullYear() && i === currentMonth;
      return {
        name,
        income: income + recurringIncomePerMonth + tradingPL,
        expenses: expenses + recurringExpensePerMonth,
        isCurrentMonth,
      };
    });
  }, [entries, trading, selectedYear, currentMonth]);

  // ── Monthly breakdown table ─────────────────────────────────────────────────
  const monthlyBreakdown = useMemo(() => {
    const recurringIncomePerMonth = entries
      .filter((e) => e.type === "income" && e.recurring)
      .reduce((s, e) => s + e.amount, 0);
    const recurringExpensePerMonth = entries
      .filter((e) => e.type === "expense" && e.recurring)
      .reduce((s, e) => s + e.amount, 0);

    return MONTHS.map((name, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const monthEntries = entries.filter((e) => e.date.startsWith(monthKey) && !e.recurring);
      const manualIncome = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const expenses = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const tradingPL = trading?.byMonth?.[monthKey] ?? 0;
      const totalInc = manualIncome + recurringIncomePerMonth + tradingPL;
      const totalExp = expenses + recurringExpensePerMonth;
      return { name, monthKey, manualIncome, tradingPL, expenses: totalExp, net: totalInc - totalExp, monthIndex: i };
    });
  }, [entries, trading, selectedYear]);

  // ── Category breakdowns ─────────────────────────────────────────────────────
  const { incomeByCategory, expenseByCategory } = useMemo(() => {
    const incMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    if (trading?.totalPremium && trading.totalPremium > 0) {
      incMap["Trading Premium"] = trading.totalPremium;
    }
    for (const e of entries) {
      if (e.type === "income") incMap[e.category] = (incMap[e.category] ?? 0) + entryAmount(e);
      else expMap[e.category] = (expMap[e.category] ?? 0) + entryAmount(e);
    }
    const sort = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { incomeByCategory: sort(incMap), expenseByCategory: sort(expMap) };
  }, [entries, trading]);

  const maxIncome = incomeByCategory[0]?.[1] ?? 0;
  const maxExpense = expenseByCategory[0]?.[1] ?? 0;
  const recentEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  const years = getAvailableYears();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tax year {selectedYear} • Personal finance &amp; trading overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28 h-9 gap-1">
              <SelectValue />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y} {y === currentYear ? "(current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Trading P&L"
          value={formatCurrency(tradingPL)}
          icon={BarChart2}
          color={tradingPL >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg="bg-primary/10"
          sub={trading ? `${trading.tradeCount} closed trades` : undefined}
          loading={!trading}
        />
        <KpiCard
          label="Other Income"
          value={formatCurrency(totalIncome)}
          icon={ArrowUpCircle}
          color="text-emerald-500"
          iconBg="bg-emerald-500/10"
          sub={`${entries.filter((e) => e.type === "income").length} entries`}
          loading={isLoading}
        />
        <KpiCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={ArrowDownCircle}
          color="text-red-500"
          iconBg="bg-red-500/10"
          sub={`${entries.filter((e) => e.type === "expense").length} entries`}
          loading={isLoading}
        />
        <KpiCard
          label="Net Income"
          value={formatCurrency(netIncome)}
          icon={netIncome >= 0 ? TrendingUp : TrendingDown}
          color={netIncome >= 0 ? "text-emerald-500" : "text-red-500"}
          iconBg={netIncome >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
          sub="Trading + Income − Expenses"
          loading={isLoading || !trading}
        />
      </div>

      {/* Quarterly P&L Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quarterlyData.map(({ label, range, net, tradingPL: qPL, expenses, isCurrent, isFuture, taxDue }) => (
          <Card key={label} className={cn(
            "overflow-hidden transition-opacity",
            isCurrent && "ring-1 ring-primary/30",
            isFuture && "opacity-50"
          )}>
            <div className={cn("h-0.5 w-full", net >= 0 ? "bg-emerald-500/60" : "bg-red-500/60")} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold text-foreground">{label}</span>
                  {isCurrent && <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary">now</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground">{range}</span>
              </div>
              <p className={cn("text-xl font-bold tabular-nums", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {net >= 0 ? "+" : ""}{formatCurrency(net)}
              </p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {qPL !== 0 && <div className="flex justify-between"><span>Trading</span><span className={cn("tabular-nums", qPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{qPL >= 0 ? "+" : ""}{formatCurrency(qPL)}</span></div>}
                {expenses > 0 && <div className="flex justify-between"><span>Expenses</span><span className="tabular-nums text-red-600 dark:text-red-400">-{formatCurrency(expenses)}</span></div>}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground/60">Tax due {taxDue}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Monthly Income vs Expenses — {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={monthlyData} barGap={2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false} width={52}
                />
                <RechartsTooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name) === "income" ? "Income (incl. trading P&L)" : "Expenses"]}
                  labelFormatter={(label, payload) => {
                    const isInProgress = payload?.[0]?.payload?.isCurrentMonth;
                    return `${String(label)}${isInProgress ? " · in progress" : ""}`;
                  }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ fontWeight: 600 }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="income" name="income" radius={[3, 3, 3, 3]} maxBarSize={32}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.income >= 0 ? "oklch(0.52 0.17 155)" : "oklch(0.65 0.22 30)"} />
                  ))}
                </Bar>
                <Bar dataKey="expenses" name="expenses" fill="oklch(0.65 0.22 30)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.52 0.17 155)" }} />
              Income + Trading P&L
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.65 0.22 30)" }} />
              Expenses · Negative income
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projections — YTD Run Rate + Tax Reserve */}
      {(ytdRunRate || taxReserve) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {/* YTD Run Rate / Final Year Summary */}
          {ytdRunRate && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {ytdRunRate.isProjection ? "Full-Year Projection" : `${selectedYear} Final Net`}
                </p>
                <p className={cn("text-2xl font-bold", ytdRunRate.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {formatCurrency(ytdRunRate.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ytdRunRate.isProjection
                    ? `At this pace (${ytdRunRate.monthsElapsed} of 12 months)`
                    : "Full year · all entries included"}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", ytdRunRate.isProjection ? "bg-primary" : "bg-emerald-500")}
                    style={{ width: `${(ytdRunRate.monthsElapsed / 12) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Reserve — set-aside progress vs target */}
          {taxReserve && (
            <Link href="/records?tab=tax" className="block group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax Reserve</p>
                    {taxReserve.target > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 font-medium",
                          taxReserve.reserve.onTrack
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {taxReserve.reserve.onTrack ? "On track" : "Behind"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">
                    <span className={taxReserve.reserve.onTrack ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {formatCurrency(taxReserve.reserve.coveredTotal)}
                    </span>
                    <span className="text-base font-normal text-muted-foreground"> / {formatCurrency(taxReserve.target)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set aside · {Math.round(taxReserve.reserve.pctOfTarget * 100)}% of est. tax · eff. rate {(taxReserve.effectiveRate * 100).toFixed(1)}%
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", taxReserve.reserve.onTrack ? "bg-emerald-500" : "bg-amber-500")}
                      style={{ width: `${Math.min(taxReserve.reserve.pctOfTarget * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {taxReserve.reserve.remainingToTarget > 0
                        ? `${formatCurrency(taxReserve.reserve.remainingToTarget)} still to set aside`
                        : "Target fully reserved"}
                    </span>
                    <span className="text-primary group-hover:underline">Manage →</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Monthly Breakdown — {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Month</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Trading P&L</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Income</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Expenses</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyBreakdown.map(({ name, manualIncome, tradingPL, expenses, net, monthIndex }) => {
                    const isCurrentMonth = selectedYear === currentYear && monthIndex === currentMonth;
                    const hasData = manualIncome > 0 || tradingPL > 0 || expenses > 0;
                    const recordsHref = `/records?year=${selectedYear}&month=${String(monthIndex + 1).padStart(2, "0")}`;
                    return (
                      <tr
                        key={name}
                        className={cn(
                          "transition-colors",
                          isCurrentMonth ? "bg-primary/5" : hasData ? "hover:bg-muted/40" : "opacity-40"
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Link
                              href={recordsHref}
                              className={cn("font-medium hover:underline underline-offset-2", isCurrentMonth ? "text-primary" : "hover:text-primary")}
                            >
                              {name}
                            </Link>
                            {isCurrentMonth && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary">current</Badge>
                            )}
                          </div>
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums text-xs",
                          tradingPL > 0 ? "text-emerald-600 dark:text-emerald-400" : tradingPL < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                        )}>
                          {tradingPL !== 0 ? formatCurrency(tradingPL) : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums text-xs",
                          manualIncome > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}>
                          {manualIncome !== 0 ? formatCurrency(manualIncome) : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums text-xs",
                          expenses > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                        )}>
                          {expenses !== 0 ? formatCurrency(expenses) : "—"}
                        </td>
                        <td className={cn("px-4 py-2.5 text-right tabular-nums text-sm font-semibold",
                          net > 0 ? "text-emerald-600 dark:text-emerald-400" : net < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                        )}>
                          {hasData ? formatCurrency(net) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold text-sm">Total</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.tradingPL, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.manualIncome, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(monthlyBreakdown.reduce((s, m) => s + m.expenses, 0))}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right tabular-nums text-sm font-bold",
                      netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(netIncome + (trading?.totalPremium ?? 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
              Income by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />) :
              incomeByCategory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No income entries yet</p> :
                incomeByCategory.map(([cat, amt]) => <CategoryBar key={cat} label={cat} amount={amt} max={maxIncome} color="bg-emerald-500" />)
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />) :
              expenseByCategory.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No expense entries yet</p> :
                expenseByCategory.map(([cat, amt]) => <CategoryBar key={cat} label={cat} amount={amt} max={maxExpense} color="bg-red-500" />)
            }
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentEntries.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No entries for {selectedYear}</p>
              <Link href="/records" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                Go to Records to add entries →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border -mx-1">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-1 py-3 hover:bg-muted/40 rounded-md transition-colors group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {entry.type === "income"
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{entry.category}</span>
                      {entry.source === "trading" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">auto</Badge>}
                    </div>
                    {entry.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${entry.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(entry.date)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditEntry(entry); setModalOpen(true); }} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(entry)} disabled={deletingId === entry.id} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddEntryModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditEntry(undefined); }}
        entry={editEntry}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
