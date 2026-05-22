"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { CreatePortfolioModal } from "@/features/portfolios/components/CreatePortfolioModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SummaryPortfolio = {
  portfolioId: string;
  name: string;
  currentCapital: number;
  capitalBase: number;
  totalProfitAll: number;
  openCount: number;
  capitalInUse: number;
  cashAvailable: number;
  expiringSoonCount: number;
};

type SummaryResponse = {
  perPortfolio: Record<string, SummaryPortfolio>;
};

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function PortfolioCard({ p }: { p: SummaryPortfolio }) {
  const pctDeployed =
    p.currentCapital > 0 ? (p.capitalInUse / p.currentCapital) * 100 : 0;
  const pctReturn =
    p.capitalBase > 0 ? (p.totalProfitAll / p.capitalBase) * 100 : 0;
  const profitPos = p.totalProfitAll >= 0;

  const deployedTone =
    pctDeployed >= 85
      ? "bg-red-500"
      : pctDeployed >= 60
        ? "bg-amber-500"
        : "bg-emerald-500";

  const statusDot =
    p.expiringSoonCount > 0 || p.cashAvailable < 0
      ? "bg-amber-400"
      : pctDeployed >= 85 || p.totalProfitAll < 0
        ? "bg-red-400"
        : "bg-emerald-500";

  return (
    <Link
      href={`/portfolios/${p.portfolioId}`}
      className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40 active:scale-[0.995]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn("h-2 w-2 rounded-full flex-shrink-0", statusDot)}
              aria-hidden
            />
            <h3 className="font-semibold text-base text-foreground truncate">
              {p.name || "Unnamed Portfolio"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {p.openCount} open · {fmtUSD(p.currentCapital)} current
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            {profitPos ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span
              className={cn(
                "text-base font-semibold tabular-nums",
                profitPos
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400",
              )}
            >
              {profitPos ? "+" : ""}
              {fmtUSD(p.totalProfitAll)}
            </span>
          </div>
          <p
            className={cn(
              "text-[11px] tabular-nums",
              profitPos
                ? "text-emerald-600/70 dark:text-emerald-400/70"
                : "text-red-400/70",
            )}
          >
            {profitPos ? "+" : ""}
            {fmtPct(pctReturn)}
          </p>
        </div>
      </div>

      {/* Capital deployed bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>{fmtPct(pctDeployed)} deployed</span>
          <span className="tabular-nums">
            {fmtUSD(p.capitalInUse)} / {fmtUSD(p.currentCapital)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full", deployedTone)}
            style={{ width: `${Math.min(pctDeployed, 100)}%` }}
          />
        </div>
      </div>

      {/* Expiring strip */}
      {p.expiringSoonCount > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
          {p.expiringSoonCount} expiring soon
        </div>
      )}
    </Link>
  );
}

export function PortfoliosLanding() {
  const { data, isLoading, error } = useSWR<SummaryResponse>(
    "/api/account/summary",
  );

  const portfolios = data ? Object.values(data.perPortfolio) : [];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap one to see its dashboard, positions, activity, and report.
          </p>
        </div>
        <CreatePortfolioModal
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          }
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 h-32 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">Failed to load portfolios.</p>
      )}

      {data && portfolios.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No portfolios yet. Create your first one to start tracking.
          </p>
          <CreatePortfolioModal
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create portfolio
              </Button>
            }
          />
        </div>
      )}

      {portfolios.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {portfolios.map((p) => (
            <PortfolioCard key={p.portfolioId} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
