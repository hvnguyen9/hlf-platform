"use client";

import useSWR from "swr";
import { useMemo } from "react";
import Link from "next/link";
import { CashAllocationCard, AssignmentLadderCard, type AllocTrade } from "./CashAllocation";

type QuoteMap = Record<
  string,
  { price: number | null; change: number | null; changePct: number | null; marketState?: string | null }
>;

type SummaryResponse = {
  totals: { currentCapital: number; committed: number; reserved: number };
  openTrades: AllocTrade[];
};

export default function LadderPageContent() {
  const { data, isLoading, error } = useSWR<SummaryResponse>("/api/account/summary");

  const openTrades = useMemo<AllocTrade[]>(
    () => [...(data?.openTrades ?? [])].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)),
    [data],
  );

  const quoteTickers = useMemo(
    () => [...new Set(openTrades.map((t) => t.ticker))].join(","),
    [openTrades],
  );
  const { data: quotesData } = useSWR<QuoteMap>(
    quoteTickers ? `/api/quotes?tickers=${quoteTickers}` : null,
    { refreshInterval: 60_000 },
  );
  const quotes: QuoteMap = quotesData ?? {};

  if (isLoading) return <div className="py-16 px-4 sm:px-6">Loading…</div>;
  if (error || !data)
    return <div className="py-16 px-4 sm:px-6 text-red-600">Failed to load.</div>;

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash &amp; Assignment Ladder</h1>
          <p className="text-xs text-muted-foreground mt-0.5">All portfolios · liquidity stress test</p>
        </div>
        <Link href="/summary" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <CashAllocationCard
        currentCapital={data.totals.currentCapital}
        committed={data.totals.committed}
        reserved={data.totals.reserved}
      />
      <AssignmentLadderCard
        currentCapital={data.totals.currentCapital}
        committed={data.totals.committed}
        trades={openTrades}
        quotes={quotes}
        collapsible={false}
      />
    </div>
  );
}
