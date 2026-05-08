"use client";

import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props {
  fiNumber: number;
  currentInvestable: number;
  score: number;
}

export function FiNumberCard({ fiNumber, currentInvestable, score }: Props) {
  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FI Number</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(fiNumber)}</p>
        <p className="text-xs text-muted-foreground">Target portfolio size for financial independence</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold">{formatPercent(score)}</span>
        </div>
        <Progress value={score} className={cn("h-2", score >= 100 && "[&>div]:bg-emerald-500")} />
        <p className="text-xs text-muted-foreground">
          {formatCurrency(currentInvestable)} invested of {formatCurrency(fiNumber)}
        </p>
      </div>
    </div>
  );
}
