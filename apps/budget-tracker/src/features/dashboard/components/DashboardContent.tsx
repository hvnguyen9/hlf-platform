"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ChevronLeft, ChevronRight, CircleDollarSign } from "lucide-react";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";
import { SpendingDonutChart } from "./SpendingDonutChart";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { BudgetProgressList } from "./BudgetProgressList";
import { RecentTransactionsList } from "./RecentTransactionsList";
import { KpiCard } from "./KpiCard";
import { formatCurrency, formatPercent, getCurrentMonthYear, formatMonthYear } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

export function DashboardContent() {
  const { month: nowMonth, year: nowYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);
  const { summary, isLoading } = useDashboardSummary(year, month);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth = month === nowMonth && year === nowYear;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly overview and budget progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[7rem] text-center">
            {formatMonthYear(month, year)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Income"
          value={formatCurrency(summary?.totalIncome ?? 0)}
          icon={TrendingUp}
          color="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          loading={isLoading}
        />
        <KpiCard
          label="Total Expenses"
          value={formatCurrency(summary?.totalExpenses ?? 0)}
          icon={TrendingDown}
          color="text-rose-600"
          iconBg="bg-rose-50 dark:bg-rose-950/30"
          loading={isLoading}
        />
        <KpiCard
          label="Saved"
          value={formatCurrency(summary?.netSavings ?? 0)}
          icon={PiggyBank}
          color="text-primary"
          iconBg="bg-primary/10"
          sub={(summary?.totalSavings ?? 0) > 0 ? "from savings categories" : "income minus expenses"}
          loading={isLoading}
        />
        <KpiCard
          label="Savings Rate"
          value={formatPercent(summary?.savingsRate ?? 0)}
          icon={Wallet}
          color="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          sub={(summary?.totalSavings ?? 0) > 0 ? "of income → savings" : "set savings categories"}
          loading={isLoading}
        />
        <KpiCard
          label="Available"
          value={formatCurrency(summary?.available ?? 0)}
          icon={CircleDollarSign}
          color={(summary?.available ?? 0) >= 0 ? "text-sky-600" : "text-destructive"}
          iconBg={(summary?.available ?? 0) >= 0 ? "bg-sky-50 dark:bg-sky-950/30" : "bg-destructive/10"}
          sub={(summary?.available ?? 0) >= 0 ? "unallocated this month" : "over budget"}
          loading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Income vs Expenses (12 months)</h2>
          <MonthlyTrendChart data={summary?.monthlyTrend ?? []} loading={isLoading} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Spending by Category</h2>
          <SpendingDonutChart data={summary?.spendingByCategory ?? []} loading={isLoading} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Budget Progress</h2>
          <BudgetProgressList items={summary?.budgetProgress ?? []} loading={isLoading} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h2>
          <RecentTransactionsList transactions={summary?.recentTransactions ?? []} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
