"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMonthlyReport, useCategoryBreakdown } from "@/features/reports/hooks/useReports";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function ReportsPageContent() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [breakdownType, setBreakdownType] = useState<"income" | "expense">("expense");

  const { report, isLoading } = useMonthlyReport(year);
  const { breakdown, isLoading: bLoading } = useCategoryBreakdown(year, breakdownType);

  const yearlyIncome = report.reduce((s, r) => s + r.income, 0);
  const yearlyExpenses = report.reduce((s, r) => s + r.expenses, 0);
  const yearlySavings = yearlyIncome - yearlyExpenses;
  const yearlySavingsRate = yearlyIncome > 0 ? (yearlySavings / yearlyIncome) * 100 : 0;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly and category analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{year}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y + 1)} disabled={year >= currentYear}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Year summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Year Income", value: formatCurrency(yearlyIncome), color: "text-emerald-600" },
          { label: "Year Expenses", value: formatCurrency(yearlyExpenses), color: "text-rose-600" },
          { label: "Year Savings", value: formatCurrency(yearlySavings), color: yearlySavings >= 0 ? "text-primary" : "text-destructive" },
          { label: "Savings Rate", value: formatPercent(yearlySavingsRate), color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Comparison</TabsTrigger>
          <TabsTrigger value="summary">Summary Table</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <div className="bg-card rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-4">Income vs Expenses — {year}</h2>
            {isLoading ? <Skeleton className="h-[280px] w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactCurrency(v)} width={62} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: "12px" }} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Month</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Income</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Expenses</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Savings</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>
                ) : report.map((r) => (
                  <tr key={r.month} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 tabular-nums">{formatCurrency(r.income)}</td>
                    <td className="px-4 py-2.5 text-right text-rose-600 tabular-nums">{formatCurrency(r.expenses)}</td>
                    <td className={cn("px-4 py-2.5 text-right tabular-nums font-semibold", r.savings >= 0 ? "text-primary" : "text-destructive")}>
                      {formatCurrency(r.savings)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{formatPercent(r.savingsRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="bg-card rounded-xl border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={breakdownType === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setBreakdownType("expense")}
              >
                Expenses
              </Button>
              <Button
                variant={breakdownType === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setBreakdownType("income")}
              >
                Income
              </Button>
            </div>
            {bLoading ? <Skeleton className="h-[260px] w-full" /> : breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data for {year}</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={breakdown} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="total" radius={[0, 3, 3, 0]}>
                    {breakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
