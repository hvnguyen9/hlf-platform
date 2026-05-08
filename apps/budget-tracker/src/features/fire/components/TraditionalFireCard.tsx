"use client";

import { Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { computeFiNumber, computeYearsToFi, computeFireScore, projectFiDate } from "@/lib/fireCalc";
import { cn } from "@/lib/utils";
import type { FIREProfile } from "@/types";

interface Props {
  profile: FIREProfile;
  totalInvestments: number;
  monthlySavings: number;
}

export function TraditionalFireCard({ profile, totalInvestments, monthlySavings }: Props) {
  const annualExpenses = profile.targetAnnualExpenses + profile.additionalRetirementSpend;
  const fiNumber = computeFiNumber(annualExpenses, profile.safeWithdrawalRate);
  const score = computeFireScore(totalInvestments, fiNumber);
  const yearsToFi = computeYearsToFi({
    currentSavings: totalInvestments,
    monthlyContribution: monthlySavings,
    annualReturn: profile.expectedReturn,
    fiNumber,
  });
  const fiDate = projectFiDate(yearsToFi);
  const isReady = score >= 100;

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-orange-50 dark:bg-orange-950/20 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Traditional FIRE</h3>
        <span className="ml-auto text-xs text-muted-foreground">4% rule · 25× expenses</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground">FI Number</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(fiNumber)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(annualExpenses)}/yr ÷ {formatPercent(profile.safeWithdrawalRate * 100, 1)} SWR</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className={cn("text-2xl font-bold", isReady ? "text-emerald-600" : "text-foreground")}>{formatPercent(score, 1)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalInvestments)} invested</p>
          </div>
        </div>

        <Progress value={score} className={cn("h-2", isReady && "[&>div]:bg-emerald-500")} />

        {isReady ? (
          <p className="text-sm font-semibold text-emerald-600 text-center">🔥 FIRE Ready!</p>
        ) : (
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Still needed</p>
              <p className="font-semibold">{formatCurrency(fiNumber - totalInvestments)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{isFinite(yearsToFi) ? "Projected date" : "Timeline"}</p>
              <p className="font-semibold">
                {isFinite(yearsToFi)
                  ? fiDate?.toLocaleDateString("en-US", { month: "short", year: "numeric" }) ?? "—"
                  : "Set monthly savings"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
