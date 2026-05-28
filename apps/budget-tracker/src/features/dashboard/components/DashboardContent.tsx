"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";
import { useSavingsGoals } from "@/features/fire/hooks/useSavingsGoals";
import { TransactionModal } from "@/features/transactions/components/TransactionModal";
import { AllocateSurplusModal } from "./AllocateSurplusModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, getCurrentMonthYear, formatMonthYear } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ExpenseLine, FlowLine } from "@/types";

export function DashboardContent() {
  const { month: nowMonth, year: nowYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);
  const { summary, isLoading, mutate } = useDashboardSummary(year, month);
  const { goals, mutate: mutateGoals } = useSavingsGoals();

  const [txOpen, setTxOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  const isCurrentMonth = month === nowMonth && year === nowYear;

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const totalSavings = summary?.totalSavings ?? 0;
  const surplus = summary?.surplus ?? 0;
  const overspent = surplus < 0;

  // Stacked bar: where this month's income goes.
  const barBase = Math.max(totalIncome, totalExpenses + totalSavings, 1);
  const pct = (v: number) => `${Math.min(100, (v / barBase) * 100)}%`;

  const activeGoals = goals.filter((g) => !g.isCompleted);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">This Month</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Where your money went, and what&apos;s left.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[7rem] text-center">{formatMonthYear(month, year)}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={isCurrentMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setTxOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Flow hero */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FlowStat label="Income" value={totalIncome} className="text-emerald-600" sign="+" />
              <FlowStat label="Expenses" value={totalExpenses} className="text-rose-600" sign="−" />
              <FlowStat label="Set aside" value={totalSavings} className="text-sky-600" sign="−" />
            </div>

            {/* Where it goes bar */}
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              <div className="h-full bg-rose-500" style={{ width: pct(totalExpenses) }} />
              <div className="h-full bg-sky-500" style={{ width: pct(totalSavings) }} />
              {!overspent && <div className="h-full bg-emerald-500" style={{ width: pct(surplus) }} />}
            </div>

            {/* Headline */}
            <div className={cn(
              "flex items-center justify-between rounded-lg px-4 py-3",
              overspent ? "bg-rose-50 dark:bg-rose-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"
            )}>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {overspent ? "Over your income this month" : "Surplus left to allocate"}
                </p>
                <p className={cn(
                  "text-2xl font-bold tabular-nums",
                  overspent ? "text-rose-600" : "text-emerald-600"
                )}>
                  {overspent ? "−" : ""}{formatCurrency(Math.abs(surplus))}
                </p>
              </div>
              {!overspent && surplus > 0 && (
                <Button size="sm" onClick={() => setAllocateOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Allocate
                </Button>
              )}
            </div>
          </div>

          {/* Expenses */}
          <Section
            title="Expenses"
            total={totalExpenses}
            totalClassName="text-rose-600"
            subtitle={summary && summary.totalBudget > 0
              ? `${formatCurrency(totalExpenses)} of ${formatCurrency(summary.totalBudget)} budgeted`
              : undefined}
            emptyText="No expenses logged this month."
            lines={summary?.expenseBreakdown ?? []}
            renderRow={(l) => <ExpenseRow key={rowKey(l)} line={l as ExpenseLine} />}
          />

          {/* Income */}
          <Section
            title="Income"
            total={totalIncome}
            totalClassName="text-emerald-600"
            emptyText="No income logged this month. Add it to see your real surplus."
            lines={summary?.incomeBreakdown ?? []}
            renderRow={(l) => <FlowRow key={rowKey(l)} line={l} accent="text-emerald-600" sign="+" />}
          />

          {/* Savings (only if present) */}
          {summary && summary.savingsBreakdown.length > 0 && (
            <Section
              title="Set aside for savings"
              total={totalSavings}
              totalClassName="text-sky-600"
              emptyText=""
              lines={summary.savingsBreakdown}
              renderRow={(l) => <FlowRow key={rowKey(l)} line={l} accent="text-sky-600" sign="" />}
            />
          )}

          {/* Surplus allocation */}
          <div className="bg-card rounded-xl border p-5">
            {overspent ? (
              <p className="text-sm text-muted-foreground">
                You spent <span className="font-medium text-foreground">{formatCurrency(Math.abs(surplus))}</span> more
                than you brought in this month. Trim an expense category above, or log any income you haven&apos;t added yet.
              </p>
            ) : surplus === 0 ? (
              <p className="text-sm text-muted-foreground">Every dollar this month is accounted for.</p>
            ) : activeGoals.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Put your {formatCurrency(surplus)} surplus to work</h2>
                </div>
                <div className="space-y-1.5">
                  {activeGoals.slice(0, 3).map((g) => {
                    const p = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
                    return (
                      <div key={g.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground truncate">{g.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                            </span>
                          </div>
                          <Progress value={p} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" onClick={() => setAllocateOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Allocate surplus
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  You have <span className="font-medium text-foreground">{formatCurrency(surplus)}</span> left over.
                  Set up a savings goal to give it a job.
                </p>
                <Link href="/retirement-calculator">
                  <Button size="sm" variant="outline">
                    New goal <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      <TransactionModal open={txOpen} onClose={() => setTxOpen(false)} onSaved={() => mutate()} />
      <AllocateSurplusModal
        open={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        onSaved={() => { mutateGoals(); mutate(); }}
        surplus={surplus}
        goals={goals}
      />
    </div>
  );
}

function rowKey(l: FlowLine) {
  return l.categoryId ?? "__none__";
}

function FlowStat({ label, value, className, sign }: { label: string; value: number; className: string; sign: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", className)}>
        {value > 0 ? sign : ""}{formatCurrency(value)}
      </p>
    </div>
  );
}

function Section({
  title, total, totalClassName, subtitle, emptyText, lines, renderRow,
}: {
  title: string;
  total: number;
  totalClassName: string;
  subtitle?: string;
  emptyText: string;
  lines: FlowLine[];
  renderRow: (line: FlowLine) => React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <span className={cn("text-base font-bold tabular-nums", totalClassName)}>{formatCurrency(total)}</span>
      </div>
      {lines.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border">{lines.map(renderRow)}</div>
      )}
    </div>
  );
}

function RecurringBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
      <Repeat className="h-2.5 w-2.5" /> recurring
    </span>
  );
}

function FlowRow({ line, accent, sign }: { line: FlowLine; accent: string; sign: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: line.color }} />
      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{line.name}</span>
      {line.recurring > 0 && <RecurringBadge />}
      <span className={cn("text-sm font-semibold tabular-nums", accent)}>
        {line.total > 0 ? sign : ""}{formatCurrency(line.total)}
      </span>
    </div>
  );
}

function ExpenseRow({ line }: { line: ExpenseLine }) {
  const hasBudget = line.budget > 0;
  const ratio = hasBudget ? line.total / line.budget : 0;
  const over = ratio > 1;
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: line.color }} />
        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{line.name}</span>
        {line.recurring > 0 && <RecurringBadge />}
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(line.total)}</span>
      </div>
      {hasBudget && (
        <div className="flex items-center gap-2 mt-1.5 pl-[1.375rem]">
          <Progress
            value={Math.min(100, ratio * 100)}
            className={cn("h-1.5 flex-1", over && "[&>div]:bg-rose-500")}
          />
          <span className={cn("text-[10px] tabular-nums flex-shrink-0", over ? "text-rose-600" : "text-muted-foreground")}>
            {over
              ? `${formatCurrency(line.total - line.budget)} over`
              : `${formatCurrency(line.budget - line.total)} left`}
          </span>
        </div>
      )}
    </div>
  );
}
