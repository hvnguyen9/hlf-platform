"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactCurrency } from "@/lib/formatters";

interface Props {
  data: { month: string; income: number; expenses: number }[];
  loading?: boolean;
}

export function MonthlyTrendChart({ data, loading }: Props) {
  if (loading) return <Skeleton className="h-[200px] w-full rounded-lg" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCompactCurrency(v)}
          width={60}
        />
        <Tooltip formatter={(v) => formatCompactCurrency(Number(v))} contentStyle={{ fontSize: "12px" }} />
        <Legend iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="income" stroke="var(--chart-5)" strokeWidth={2} dot={false} name="Income" />
        <Line type="monotone" dataKey="expenses" stroke="var(--chart-4)" strokeWidth={2} dot={false} name="Expenses" />
      </LineChart>
    </ResponsiveContainer>
  );
}
