"use client";

import { useState } from "react";
import Link from "next/link";
import { PiggyBank, Flame, Waves, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import {
  computeFiNumber, computeYearsToFi, computeFireScore, projectFiDate,
  computeCoastFiNumber, computeWheelMonthlyIncome, computeWheelPortfolioTarget, computeWheelCoverage,
} from "@/lib/fireCalc";
import { cn } from "@/lib/utils";

interface Inputs {
  annualExpenses: string;
  additionalSpend: string;
  currentPortfolio: string;
  monthlyBudget: string;
  swr: string;
  expectedReturn: string;
  currentAge: string;
  targetAge: string;
  wheelRate: number;
}

const DEFAULTS: Inputs = {
  annualExpenses: "",
  additionalSpend: "0",
  currentPortfolio: "",
  monthlyBudget: "",
  swr: "4",
  expectedReturn: "7",
  currentAge: "",
  targetAge: "",
  wheelRate: 2.5,
};

export function PublicRetirementCalculator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const set = (key: keyof Inputs, value: string | number) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const annualExpenses = (parseFloat(inputs.annualExpenses) || 0) + (parseFloat(inputs.additionalSpend) || 0);
  const portfolio = parseFloat(inputs.currentPortfolio) || 0;
  const monthlyBudget = parseFloat(inputs.monthlyBudget) || annualExpenses / 12;
  const swr = (parseFloat(inputs.swr) || 4) / 100;
  const annualReturn = (parseFloat(inputs.expectedReturn) || 7) / 100;
  const currentAge = parseInt(inputs.currentAge) || null;
  const targetAge = parseInt(inputs.targetAge) || null;
  const wheelRate = inputs.wheelRate / 100;

  // Traditional FIRE
  const fiNumber = computeFiNumber(annualExpenses, swr);
  const fireScore = computeFireScore(portfolio, fiNumber);
  const isFireReady = fireScore >= 100;
  const yearsToFi = computeYearsToFi({ currentSavings: portfolio, monthlyContribution: 0, annualReturn, fiNumber });
  const fiDate = projectFiDate(yearsToFi);

  // Coast FIRE
  const canCoast = currentAge != null && targetAge != null && targetAge > currentAge;
  const coastNumber = canCoast
    ? computeCoastFiNumber({ fiNumber, currentAge: currentAge!, targetRetirementAge: targetAge!, annualReturn })
    : null;
  const coastScore = coastNumber ? computeFireScore(portfolio, coastNumber) : 0;
  const isCoasting = coastScore >= 100;

  // Wheel FIRE
  const monthlyIncome = computeWheelMonthlyIncome(portfolio, wheelRate);
  const wheelTarget = computeWheelPortfolioTarget(monthlyBudget, wheelRate);
  const wheelCoverage = computeWheelCoverage(portfolio, wheelRate, monthlyBudget);
  const isWheelReady = wheelCoverage >= 100;

  const hasEnoughToShow = annualExpenses > 0 || portfolio > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="py-12 px-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, oklch(0.42 0.18 195), oklch(0.34 0.16 210) 60%, oklch(0.28 0.14 220))" }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative max-w-4xl mx-auto z-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
              <PiggyBank className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white/80">HLF Financial Strategies</span>
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Retirement Calculator</h1>
          <p className="text-lg text-white/75 max-w-2xl">
            See how Traditional FIRE, Coast FIRE, and Wheel Strategy income compare — side by side,
            based on your numbers. No account needed.
          </p>
          <p className="mt-4 text-sm text-white/50">
            Want to save your data and track against your actual budget?{" "}
            <Link href="/login" className="text-white/80 underline hover:text-white">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Input form */}
        <div className="bg-card rounded-xl border p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Your Numbers</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Annual Expenses in Retirement ($)</Label>
              <FormattedNumberInput
                value={inputs.annualExpenses}
                onChange={(v) => set("annualExpenses", v)}
                placeholder="e.g. 60,000"
              />
              <p className="text-xs text-muted-foreground">What you need to live on per year</p>
            </div>

            <div className="space-y-1.5">
              <Label>Additional Retirement Spending ($)</Label>
              <FormattedNumberInput
                value={inputs.additionalSpend}
                onChange={(v) => set("additionalSpend", v)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Travel, lifestyle upgrades, etc.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Current Portfolio / Investable Assets ($)</Label>
              <FormattedNumberInput
                value={inputs.currentPortfolio}
                onChange={(v) => set("currentPortfolio", v)}
                placeholder="e.g. 250,000"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Monthly Budget / Target Income ($)</Label>
              <FormattedNumberInput
                value={inputs.monthlyBudget}
                onChange={(v) => set("monthlyBudget", v)}
                placeholder={annualExpenses > 0 ? formatCurrency(annualExpenses / 12).replace("$", "") : "e.g. 5,000"}
              />
              <p className="text-xs text-muted-foreground">Used for Wheel income target. Defaults to expenses ÷ 12.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Safe Withdrawal Rate (%)</Label>
              <Input type="number" step="0.1" min="1" max="10" placeholder="4"
                value={inputs.swr} onChange={(e) => set("swr", e.target.value)} />
              <p className="text-xs text-muted-foreground">4% = Trinity Study default</p>
            </div>

            <div className="space-y-1.5">
              <Label>Expected Annual Return (%)</Label>
              <Input type="number" step="0.5" min="1" max="20" placeholder="7"
                value={inputs.expectedReturn} onChange={(e) => set("expectedReturn", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Current Age <span className="text-muted-foreground font-normal">(for Coast FIRE)</span></Label>
              <Input type="number" min="18" max="100" placeholder="e.g. 35"
                value={inputs.currentAge} onChange={(e) => set("currentAge", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Target Retirement Age <span className="text-muted-foreground font-normal">(for Coast FIRE)</span></Label>
              <Input type="number" min="18" max="100" placeholder="e.g. 50"
                value={inputs.targetAge} onChange={(e) => set("targetAge", e.target.value)} />
            </div>
          </div>

          {/* Wheel rate slider */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-emerald-600" />
                <Label>Wheel Strategy Monthly Yield</Label>
              </div>
              <span className="text-lg font-bold text-emerald-600">{inputs.wheelRate.toFixed(1)}%/mo</span>
            </div>
            <Slider
              min={0.5} max={5} step={0.1} value={[inputs.wheelRate]}
              onValueChange={([v]) => set("wheelRate", v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5% conservative</span>
              <span>2.5% target</span>
              <span>5% aggressive</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasEnoughToShow && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Retirement Scenarios</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Traditional FIRE */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-orange-50 dark:bg-orange-950/20 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-semibold">Traditional FIRE</h3>
                  <span className="ml-auto text-xs text-muted-foreground">4% rule · 25× expenses</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">FI Number</p>
                      <p className="text-xl font-bold truncate">{fiNumber > 0 ? formatCompactCurrency(fiNumber) : "—"}</p>
                      {annualExpenses > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCompactCurrency(annualExpenses)}/yr · {Math.round(swr * 100)}% SWR
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className={cn("text-xl font-bold", isFireReady ? "text-emerald-600" : "text-foreground")}>
                        {fiNumber > 0 && portfolio > 0 ? formatPercent(fireScore, 1) : "—"}
                      </p>
                    </div>
                  </div>
                  {fiNumber > 0 && portfolio > 0 && (
                    <Progress value={fireScore} className={cn("h-2", isFireReady && "[&>div]:bg-emerald-500")} />
                  )}
                  {isFireReady ? (
                    <p className="text-sm font-semibold text-emerald-600 text-center">🔥 FIRE Ready!</p>
                  ) : fiNumber > 0 ? (
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Still needed</p>
                        <p className="font-semibold">{formatCompactCurrency(Math.max(0, fiNumber - portfolio))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Projected date</p>
                        <p className="font-semibold text-xs">
                          {isFinite(yearsToFi) && fiDate && portfolio > 0
                            ? fiDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                            : "Enter portfolio value"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Enter annual expenses to calculate</p>
                  )}
                </div>
              </div>

              {/* Coast FIRE */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-sky-50 dark:bg-sky-950/20 flex items-center gap-2">
                  <Waves className="h-4 w-4 text-sky-500" />
                  <h3 className="text-sm font-semibold">Coast FIRE</h3>
                  <span className="ml-auto text-xs text-muted-foreground">invest now, let it grow</span>
                </div>
                <div className="p-4 space-y-4">
                  {!canCoast ? (
                    <p className="text-sm text-muted-foreground">Enter your current and target retirement age to calculate Coast FIRE.</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Coast Number (today)</p>
                          <p className="text-xl font-bold truncate">{fiNumber > 0 ? formatCompactCurrency(coastNumber!) : "—"}</p>
                          {fiNumber > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Grows to {formatCompactCurrency(fiNumber)} by age {targetAge}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className={cn("text-xl font-bold", isCoasting ? "text-sky-600" : "text-foreground")}>
                            {fiNumber > 0 && portfolio > 0 ? formatPercent(coastScore, 1) : "—"}
                          </p>
                        </div>
                      </div>
                      {fiNumber > 0 && portfolio > 0 && (
                        <Progress value={coastScore} className={cn("h-2", isCoasting && "[&>div]:bg-sky-500")} />
                      )}
                      {isCoasting ? (
                        <p className="text-sm font-semibold text-sky-600 text-center">🌊 You&apos;re coasting!</p>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Still needed to coast</p>
                            <p className="font-semibold">
                              {fiNumber > 0 ? formatCompactCurrency(Math.max(0, coastNumber! - portfolio)) : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Coast to age</p>
                            <p className="font-semibold">{targetAge}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Wheel FIRE */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">Wheel FIRE</h3>
                  <span className="ml-auto text-xs text-muted-foreground">{inputs.wheelRate.toFixed(1)}%/mo yield</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Monthly income now</p>
                      <p className={cn("text-lg font-bold", isWheelReady ? "text-emerald-600" : "text-foreground")}>
                        {portfolio > 0 ? formatCurrency(monthlyIncome) : "—"}<span className="text-xs font-normal text-muted-foreground">{portfolio > 0 ? "/mo" : ""}</span>
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Portfolio target</p>
                      <p className="text-lg font-bold">
                        {isFinite(wheelTarget) && monthlyBudget > 0 ? formatCompactCurrency(wheelTarget) : "—"}
                      </p>
                    </div>
                  </div>
                  {monthlyBudget > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Budget coverage</span>
                          <span className={cn("font-semibold", isWheelReady ? "text-emerald-600" : "text-foreground")}>
                            {portfolio > 0 ? formatPercent(wheelCoverage, 1) : "—"}
                          </span>
                        </div>
                        {portfolio > 0 && (
                          <Progress value={wheelCoverage} className={cn("h-2", isWheelReady && "[&>div]:bg-emerald-500")} />
                        )}
                      </div>
                      {isWheelReady ? (
                        <p className="text-sm font-semibold text-emerald-600 text-center">⚙️ Wheel retirement ready!</p>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly gap</p>
                            <p className="font-semibold text-rose-600">
                              {portfolio > 0 ? `${formatCurrency(Math.max(0, monthlyBudget - monthlyIncome))}/mo` : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Portfolio needed</p>
                            <p className="font-semibold">{formatCompactCurrency(Math.max(0, wheelTarget - portfolio))}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!monthlyBudget && (
                    <p className="text-sm text-muted-foreground text-center">Enter annual expenses or monthly budget to see coverage</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 leading-snug border-t pt-2 mt-1">
                    ⚠ Options trading involves substantial risk of loss. Monthly yield targets are projections only — actual returns vary with market conditions, assignment risk, and volatility. This is not financial advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasEnoughToShow && (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">Enter your annual expenses and portfolio value above to see your retirement scenarios.</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-card rounded-xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Want to track this against your actual budget?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sign in to connect your transactions, recurring expenses, and investment accounts — the calculator auto-fills from real data.
            </p>
          </div>
          <Link href="/login">
            <Button className="shrink-0">Sign In</Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 pb-4">
          © {new Date().getFullYear()} HL Financial Strategies · For informational purposes only
        </p>
      </div>
    </div>
  );
}
