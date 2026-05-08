"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  data: { categoryId: string; name: string; color: string; amount: number }[];
  loading?: boolean;
}

export function SpendingDonutChart({ data, loading }: Props) {
  if (loading) return <Skeleton className="h-[220px] w-full rounded-lg" />;

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        No expense data for this month
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="amount"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
          contentStyle={{ fontSize: "12px" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs">{String(value)}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
