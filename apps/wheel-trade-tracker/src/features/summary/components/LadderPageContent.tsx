"use client";

import useSWR from "swr";
import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CashAllocationCard, type AllocTrade } from "./CashAllocation";

type QuoteMap = Record<
  string,
  { price: number | null; change: number | null; changePct: number | null; marketState?: string | null }
>;

type PerPortfolio = {
  portfolioId: string;
  name: string;
  currentCapital: number;
  committed: number;
  reserved: number;
  openTradesList: AllocTrade[];
};

type SummaryResponse = {
  totals: { currentCapital: number; committed: number; reserved: number };
  perPortfolio: Record<string, PerPortfolio>;
  openTrades: AllocTrade[];
};

export default function LadderPageContent() {
  const { data, isLoading, error } = useSWR<SummaryResponse>("/api/account/summary");
  const params = useSearchParams();
  const portfolioId = params.get("portfolio");

  // Scope to a single portfolio when arriving from its Positions tab.
  const scope = useMemo(() => {
    const p = portfolioId ? data?.perPortfolio?.[portfolioId] : undefined;
    if (p) {
      return {
        title: p.name,
        capitalLabel: "Portfolio capital",
        currentCapital: p.currentCapital,
        committed: p.committed,
        reserved: p.reserved,
        trades: [...(p.openTradesList ?? [])].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)),
      };
    }
    return {
      title: "All portfolios",
      capitalLabel: "Account capital",
      currentCapital: data?.totals.currentCapital ?? 0,
      committed: data?.totals.committed ?? 0,
      reserved: data?.totals.reserved ?? 0,
      trades: [...(data?.openTrades ?? [])].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)),
    };
  }, [data, portfolioId]);

  const quoteTickers = useMemo(
    () => [...new Set(scope.trades.map((t) => t.ticker))].join(","),
    [scope.trades],
  );
  const { data: quotesData } = useSWR<QuoteMap>(
    quoteTickers ? `/api/quotes?tickers=${quoteTickers}` : null,
    { refreshInterval: 60_000 },
  );
  const quotes: QuoteMap = quotesData ?? {};

  if (isLoading) return <div className="py-16 px-4 sm:px-6">Loading…</div>;
  if (error || !data)
    return <div className="py-16 px-4 sm:px-6 text-red-600">Failed to load.</div>;

  const backHref = portfolioId ? `/portfolios/${portfolioId}?tab=Positions` : "/summary";

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash &amp; Assignment Ladder</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{scope.title} · liquidity stress test</p>
        </div>
        <Link href={backHref} className="text-sm text-primary hover:underline">
          ← Back
        </Link>
      </div>

      <CashAllocationCard
        currentCapital={scope.currentCapital}
        committed={scope.committed}
        reserved={scope.reserved}
        capitalLabel={scope.capitalLabel}
        trades={scope.trades}
        quotes={quotes}
      />
    </div>
  );
}
