"use client";

import { useMemo } from "react";
import { AlertTriangle, ChevronDown, Info, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookkeeping, useTradingSummary } from "@/features/bookkeeping/hooks/useBookkeeping";
import { TaxReserveTracker } from "@/features/bookkeeping/components/TaxReserveTracker";
import { estimateTax, getQuarterlyDates, SUPPORTED_YEARS } from "@/lib/taxCalc";
import type { TaxYear } from "@/lib/taxCalc";
import { formatCurrency, cn, entryAmount } from "@/lib/utils";
import { SE_TAXABLE_CATEGORIES } from "@/types";

const START_YEAR = 2025;

function getAvailableYears(): TaxYear[] {
  const current = new Date().getFullYear();
  return SUPPORTED_YEARS.filter((y) => y <= current);
}

function getYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function Row({
  label, value, indent = false, muted = false, highlight = false, positive, negative, sub,
}: {
  label: string; value: string | number; indent?: boolean; muted?: boolean; highlight?: boolean;
  positive?: boolean; negative?: boolean; sub?: string;
}) {
  const formatted = typeof value === "number" ? formatCurrency(value) : value;
  return (
    <div className={cn(
      "flex items-start justify-between py-2",
      indent ? "pl-4" : "",
      highlight ? "font-semibold" : "",
    )}>
      <div className="flex-1 min-w-0 pr-4">
        <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <span className={cn(
        "text-sm tabular-nums flex-shrink-0 font-medium",
        positive ? "text-emerald-600 dark:text-emerald-400" : "",
        negative ? "text-red-600 dark:text-red-400" : "",
        muted ? "text-muted-foreground" : "",
        highlight ? "text-base" : "",
      )}>
        {formatted}
      </span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ReserveGauge({ rate }: { rate: number }) {
  const pct = Math.min(rate * 100, 50);
  const color = rate >= 0.25 ? "bg-red-500" : rate >= 0.18 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden relative">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct * 2}%` }} />
      </div>
      <div className="text-center">
        <span className="text-2xl font-bold">{Math.round(rate * 100)}%</span>
        <span className="text-sm text-muted-foreground ml-1">recommended reserve</span>
      </div>
    </div>
  );
}

interface Props {
  /** Year controlled by parent. If omitted, component manages its own state. */
  year?: number;
}

export function TaxEstimate({ year: yearProp }: Props) {
  const currentYear = new Date().getFullYear();
  const fallback = SUPPORTED_YEARS.includes(currentYear as TaxYear) ? currentYear as TaxYear : START_YEAR as TaxYear;
  const selectedYear: TaxYear = (
    yearProp && SUPPORTED_YEARS.includes(yearProp as TaxYear) ? yearProp as TaxYear : fallback
  );

  const { from, to } = getYearRange(selectedYear);
  const { data: entries = [], isLoading } = useBookkeeping(from, to);
  const { data: trading, isLoading: tradingLoading } = useTradingSummary(from, to);

  const years = getAvailableYears();

  const { input, result } = useMemo(() => {
    // SE-taxable: Freelance, Consulting, Blog Subscribers (Schedule C)
    const businessIncome = entries
      .filter((e) => e.type === "income" && SE_TAXABLE_CATEGORIES.includes(e.category))
      .reduce((s, e) => s + entryAmount(e), 0);

    const otherIncome = entries
      .filter((e) => e.type === "income" && !SE_TAXABLE_CATEGORIES.includes(e.category))
      .reduce((s, e) => s + entryAmount(e), 0);

    const businessExpenses = entries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + entryAmount(e), 0);

    const tradingIncome = trading?.totalPremium ?? 0;

    const inp = { year: selectedYear, tradingIncome, businessIncome, otherIncome, businessExpenses };
    return { input: inp, result: estimateTax(inp) };
  }, [entries, trading, selectedYear]);

  const quarterlyDates = getQuarterlyDates(selectedYear);
  const loading = isLoading || tradingLoading;

  return (
    <div className="space-y-6">

      {/* Header — only shown when used standalone (not inside Records) */}
      {!yearProp && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tax Estimate</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Married Filing Jointly · San Diego, CA · 1 dependent
            </p>
          </div>
          <Select value={String(selectedYear)}>
            <SelectTrigger className="w-36 h-9 gap-1">
              <SelectValue />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>Tax Year {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex gap-3 p-3.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
          <strong>Estimate only.</strong> Based on {selectedYear} tax rules for MFJ in California with 1 dependent.
          Trading premium income is treated as ordinary income (short-term capital gains). Consult a CPA before filing.
          {selectedYear === 2026 && " 2026 reflects IRS Rev. Proc. 2025-32 and OBBBA changes (TCJA made permanent, CTC raised to $2,200)."}
        </p>
      </div>

      {/* Reserve tracker — set-aside tally + quarterly payment schedule */}
      <TaxReserveTracker year={selectedYear} target={result.totalEstimatedTax} loading={loading} />

      {/* Reserve rate gauge */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base font-semibold">Recommended Reserve Rate</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <ReserveGauge rate={result.recommendedReserveRate} />
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Net Income", value: result.netIncome, color: "text-foreground" },
          { label: "Total Est. Tax", value: result.totalEstimatedTax, color: "text-red-500" },
          { label: "Effective Rate", value: `${(result.effectiveTaxRate * 100).toFixed(1)}%`, color: "text-foreground" },
          { label: "Quarterly Payment", value: result.quarterlyPayment, color: "text-amber-600 dark:text-amber-400" },
        ] as const).map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
              {loading ? <Skeleton className="h-6 w-20 mt-1.5" /> : (
                <p className={`text-lg font-bold mt-1 ${card.color}`}>
                  {typeof card.value === "number" ? formatCurrency(card.value) : card.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed breakdown */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base font-semibold">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border/60">

              <SectionDivider label="Income" />
              <Row label="Trading Income (wheel strategy)" value={input.tradingIncome} positive={input.tradingIncome > 0}
                sub="Short-term capital gains • not subject to self-employment tax" />
              <Row label="SE Income (Freelance / Consulting / Blog)" value={input.businessIncome} positive={input.businessIncome > 0}
                indent sub="Subject to self-employment tax (15.3%)" />
              <Row label="Other Income" value={input.otherIncome} positive={input.otherIncome > 0} indent />
              <Row label="Business Expenses" value={-input.businessExpenses} negative={input.businessExpenses > 0}
                sub="All bookkeeping expense entries" />
              <Row label="Net Income" value={result.netIncome} highlight />

              <SectionDivider label="Self-Employment Tax (federal)" />
              <Row label="Net Self-Employment Income" value={result.netSeIncome} muted
                sub="Business income portion after pro-rated expense allocation" />
              <Row label="Self-Employment Tax (15.3% × 92.35%)" value={result.selfEmploymentTax} negative={result.selfEmploymentTax > 0} indent />
              <Row label="SE Tax Deduction (50% of SE tax)" value={-result.selfEmploymentDeduction} positive={result.selfEmploymentDeduction > 0} indent />

              <SectionDivider label="Federal Income Tax" />
              <Row label="Adjusted Gross Income" value={result.agi} />
              <Row label={`Standard Deduction (MFJ ${selectedYear})`} value={-result.federalStandardDeduction} positive indent />
              <Row label="Federal Taxable Income" value={result.federalTaxableIncome} highlight />
              <Row label="Federal Income Tax (brackets)" value={result.federalIncomeTax} negative={result.federalIncomeTax > 0} />
              <Row label={`Child Tax Credit (1 × ${selectedYear >= 2026 ? "$2,200" : "$2,000"})`} value={-result.childTaxCredit} positive={result.childTaxCredit > 0} indent />
              {result.niit > 0 && (
                <Row label="Net Investment Income Tax (3.8%)" value={result.niit} negative
                  sub={`Applied on investment income above $250k AGI threshold`} indent />
              )}
              <Row label="Net Federal Tax" value={result.netFederalTax} negative={result.netFederalTax > 0} highlight />

              <SectionDivider label="California State Tax" />
              <Row label="Net Income (CA basis)" value={result.netIncome} />
              <Row label="CA Standard Deduction (MFJ)" value={-result.caStandardDeduction} positive indent />
              <Row label="CA Taxable Income" value={result.caTaxableIncome} highlight />
              <Row label="CA Income Tax (brackets)" value={result.caGrossTax} negative={result.caGrossTax > 0} />
              <Row label="CA Exemption Credits (MFJ + 1 dependent)" value={-result.caExemptionCredit} positive={result.caExemptionCredit > 0} indent />
              <Row label="Net CA Tax" value={result.netCaTax} negative={result.netCaTax > 0} highlight />

              <SectionDivider label="Summary" />
              <Row label="Net Federal Tax" value={result.netFederalTax} negative={result.netFederalTax > 0} />
              <Row label="Net California Tax" value={result.netCaTax} negative={result.netCaTax > 0} />
              <Row label="Total Estimated Tax Liability" value={result.totalEstimatedTax} negative={result.totalEstimatedTax > 0} highlight />
              <Row label="Effective Tax Rate" value={`${(result.effectiveTaxRate * 100).toFixed(2)}%`} />
              <Row label="Recommended Reserve Rate" value={`${Math.round(result.recommendedReserveRate * 100)}%`} positive />
              <Row
                label="Amount to Reserve (est. tax + 10% buffer)"
                value={result.totalEstimatedTax * 1.1}
                negative highlight
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarterly estimated payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            Estimated Quarterly Tax Payments
            <Badge variant="outline" className="text-xs font-normal">Form 1040-ES</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quarterlyDates.map(({ label, date }) => {
                const payment = result.quarterlyPayment;
                const isPast = new Date(date) < new Date();
                return (
                  <div key={label} className={cn(
                    "p-3 rounded-lg border text-center space-y-1",
                    isPast ? "border-border bg-muted/30 opacity-60" : "border-primary/30 bg-primary/5"
                  )}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{formatCurrency(payment)}</p>
                    <p className="text-[11px] text-muted-foreground">{date}</p>
                    {isPast && <p className="text-[10px] text-muted-foreground italic">past</p>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Quarterly payments are <strong>total estimated tax ÷ 4</strong>. Underpayment penalty applies if total payments are less than 90% of current-year tax or 100% of prior-year tax. Include both federal and CA estimated payments.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Income source note */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {result.netIncome >= result.totalEstimatedTax
                ? <TrendingUp className="h-5 w-5 text-emerald-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-medium">How this estimate was built</p>
              <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
                <li><strong>Trading income</strong> (from closed wheel trades) = ordinary income, not subject to SE tax</li>
                <li><strong>Freelance / Consulting / Blog Subscribers</strong> categories = subject to 15.3% SE tax on 92.35% of net</li>
                <li><strong>All expense entries</strong> counted as deductible business expenses</li>
                <li><strong>NIIT (3.8%)</strong> applies only if AGI exceeds $250k MFJ threshold</li>
                <li>Add rental sales or other one-off income as a bookkeeping income entry</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
