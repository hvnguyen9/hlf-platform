"use client";

import { Waves } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { computeFiNumber, computeCoastFiNumber, computeFireScore } from "@/lib/fireCalc";
import { cn } from "@/lib/utils";
import type { FIREProfile } from "@/types";

interface Props {
  profile: FIREProfile;
  totalInvestments: number;
}

export function CoastFireCard({ profile, totalInvestments }: Props) {
  const { currentAge, targetRetirementAge, expectedReturn, safeWithdrawalRate, additionalRetirementSpend } = profile;
  const annualExpenses = profile.targetAnnualExpenses + additionalRetirementSpend;
  const fiNumber = computeFiNumber(annualExpenses, safeWithdrawalRate);

  const canCompute = currentAge != null && targetRetirementAge != null && targetRetirementAge > currentAge;
  const coastNumber = canCompute
    ? computeCoastFiNumber({ fiNumber, currentAge: currentAge!, targetRetirementAge: targetRetirementAge!, annualReturn: expectedReturn })
    : null;
  const score = coastNumber ? computeFireScore(totalInvestments, coastNumber) : 0;
  const isCoasting = score >= 100;
  const yearsLeft = (targetRetirementAge ?? 0) - (currentAge ?? 0);

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-sky-50 dark:bg-sky-950/20 flex items-center gap-2">
        <Waves className="h-4 w-4 text-sky-500" />
        <h3 className="text-sm font-semibold text-foreground">Coast FIRE</h3>
        <span className="ml-auto text-xs text-muted-foreground">invest now, let it grow</span>
      </div>
      <div className="p-4 space-y-4">
        {!canCompute ? (
          <p className="text-sm text-muted-foreground">Set your current age and target retirement age in assumptions to calculate Coast FIRE.</p>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">Coast FIRE Number (today)</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(coastNumber!)}</p>
                <p className="text-xs text-muted-foreground">Needed now to reach {formatCurrency(fiNumber)} in {yearsLeft}y</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className={cn("text-2xl font-bold", isCoasting ? "text-sky-600" : "text-foreground")}>{formatPercent(score, 1)}</p>
              </div>
            </div>

            <Progress value={score} className={cn("h-2", isCoasting && "[&>div]:bg-sky-500")} />

            {isCoasting ? (
              <p className="text-sm font-semibold text-sky-600 text-center">🌊 You&apos;re coasting! No more contributions needed.</p>
            ) : (
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Still needed to coast</p>
                  <p className="font-semibold">{formatCurrency(Math.max(0, coastNumber! - totalInvestments))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Then let it grow until</p>
                  <p className="font-semibold">age {targetRetirementAge}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
