"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  items: { categoryId: string; name: string; color: string; budgeted: number; actual: number }[];
  loading?: boolean;
}

export function BudgetProgressList({ items, loading }: Props) {
  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
    </div>
  );

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No budgets set for this month.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = item.budgeted > 0 ? Math.min(100, (item.actual / item.budgeted) * 100) : 100;
        const over = item.actual > item.budgeted && item.budgeted > 0;
        const warn = pct >= 80 && !over;
        return (
          <div key={item.categoryId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="font-medium text-foreground">{item.name}</span>
              </div>
              <span className={cn("tabular-nums", over && "text-destructive")}>
                {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}
              </span>
            </div>
            <Progress
              value={pct}
              className={cn(
                "h-1.5",
                over ? "[&>div]:bg-destructive" : warn ? "[&>div]:bg-amber-500" : ""
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
