"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { computeWheelMonthlyIncome, computeWheelPortfolioTarget, computeWheelCoverage } from "@/lib/fireCalc";
import { cn } from "@/lib/utils";
import type { FIREProfile } from "@/types";

interface Props {
  profile: FIREProfile;
  totalInvestments: number;
  budgetMonthly: number;
}

export function WheelFireCard({ profile, totalInvestments, budgetMonthly }: Props) {
  const [rate, setRate] = useState(parseFloat((profile.wheelMonthlyRate * 100).toFixed(2)));

  const monthlyTarget = budgetMonthly > 0 ? budgetMonthly : (profile.targetAnnualExpenses + profile.additionalRetirementSpend) / 12;
  const currentMonthlyIncome = computeWheelMonthlyIncome(totalInvestments, rate / 100);
  const portfolioNeeded = computeWheelPortfolioTarget(monthlyTarget, rate / 100);
  const coverage = computeWheelCoverage(totalInvestments, rate / 100, monthlyTarget);
  const isRetirementReady = coverage >= 100;

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-foreground">Wheel FIRE</h3>
        <span className="ml-auto text-xs text-muted-foreground">income from portfolio yield</span>
      </div>
      <div className="p-4 space-y-4">
        {/* Rate slider */}
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly yield rate</span>
            <span className="font-bold text-emerald-600">{rate.toFixed(1)}%/mo = {formatPercent(rate * 12, 0)}/yr</span>
          </div>
          <Slider min={0.5} max={5} step={0.1} value={[rate]} onValueChange={([v]) => setRate(v)} />
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Current monthly income</p>
            <p className={cn("text-xl font-bold", isRetirementReady ? "text-emerald-600" : "text-foreground")}>
              {formatCurrency(currentMonthlyIncome)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-muted-foreground">from {formatCurrency(totalInvestments)} portfolio</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Portfolio target</p>
            <p className="text-xl font-bold text-foreground">
              {isFinite(portfolioNeeded) ? formatCurrency(portfolioNeeded) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">to cover {formatCurrency(monthlyTarget)}/mo</p>
          </div>
        </div>

        {/* Coverage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Budget coverage</span>
            <span className={cn("font-semibold", isRetirementReady ? "text-emerald-600" : "text-foreground")}>
              {formatPercent(coverage, 1)}
            </span>
          </div>
          <Progress value={coverage} className={cn("h-2", isRetirementReady && "[&>div]:bg-emerald-500")} />
        </div>

        {isRetirementReady ? (
          <p className="text-sm font-semibold text-emerald-600 text-center">⚙️ Wheel retirement ready!</p>
        ) : (
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Monthly income gap</p>
              <p className="font-semibold text-rose-600">{formatCurrency(Math.max(0, monthlyTarget - currentMonthlyIncome))}/mo</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Portfolio still needed</p>
              <p className="font-semibold">{formatCurrency(Math.max(0, portfolioNeeded - totalInvestments))}</p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/50 leading-snug border-t pt-2 mt-1">
          ⚠ Options trading involves substantial risk of loss. Monthly yield targets are projections only — actual returns vary with market conditions, assignment risk, and volatility. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
