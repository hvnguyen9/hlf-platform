"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  loading?: boolean;
}

export function RecentTransactionsList({ transactions, loading }: Props) {
  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
    </div>
  );

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions this month.</p>;
  }

  return (
    <div className="space-y-1">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: t.category?.color ?? "#94a3b8" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {t.description || t.category?.name || "Uncategorized"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.category?.name} · {formatDateShort(t.date)}
            </p>
          </div>
          <span className={cn(
            "text-sm font-semibold tabular-nums flex-shrink-0",
            t.type === "income" ? "text-emerald-600" : "text-rose-600"
          )}>
            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
