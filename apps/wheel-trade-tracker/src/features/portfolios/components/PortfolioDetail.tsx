"use client";

import { AddTradeModal } from "@/features/trades/components/AddTradeModal";
import { OpenTradesTable } from "@/features/trades/components/TradeTables/OpenTradesTable";
import { StocksTable } from "@/features/stocks/components/StocksTable";
import dynamic from "next/dynamic";
const ClosedTradesTable = dynamic(
  () =>
    import("@/features/trades/components/TradeTables/ClosedTradesTable").then(
      (m) => m.ClosedTradesTable,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
    ),
  },
);
const AccountSummaryContent = dynamic(
  () => import("@/features/summary/components/AccountSummaryContent"),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
    ),
  },
);

const AccountsReportContent = dynamic(
  () =>
    import("@/features/reports/components/AccountReportsContent").then(
      (m) => m.AccountsReportContent,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground py-8 text-center">Loading report…</p>
    ),
  },
);

import { Portfolio } from "@/types";
import { useTrades } from "@/features/trades/hooks/useTrades";
import { useDetailMetrics } from "@/features/portfolios/hooks/useDetailMetrics";
import { CashAllocationMini } from "@/features/summary/components/CashAllocation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useHorizontalSwipe } from "@hlf/ui/use-horizontal-swipe";

function dollars(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const TABS = ["Overview", "Positions", "Activity", "Report"] as const;
type Tab = (typeof TABS)[number];

export function PortfolioDetail({ portfolio }: { portfolio: Portfolio }) {
  const { trades: openTrades, isLoading: loadingOpen } = useTrades(portfolio.id, "open");
  const { data: m } = useDetailMetrics(portfolio.id);

  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && TABS.includes(tabParam) ? tabParam : "Overview",
  );

  // Keep local tab state in sync when the URL param changes (e.g. from the
  // persistent nav bar clicking a tab while already on this page).
  useEffect(() => {
    const t = (searchParams.get("tab") ?? "Overview") as Tab;
    const next = TABS.includes(t) ? t : "Overview";
    if (next !== activeTab) setActiveTab(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    // Sync to URL so PortfolioSubNav stays in sync; replace avoids stacking
    // history entries for every tab switch.
    router.replace(`/portfolios/${portfolio.id}?tab=${tab}`, { scroll: false });
  }

  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => {
      const idx = TABS.indexOf(activeTab);
      if (idx < TABS.length - 1) switchTab(TABS[idx + 1]);
    },
    onSwipeRight: () => {
      const idx = TABS.indexOf(activeTab);
      if (idx > 0) switchTab(TABS[idx - 1]);
    },
  });

  const starting = Number(portfolio.startingCapital ?? 0);
  const capitalBase = m?.capitalBase != null ? Number(m.capitalBase) : starting;
  const currentCapital =
    m?.currentCapital != null ? Number(m.currentCapital) : capitalBase + Number(m?.totalProfit ?? 0);
  const potentialPremium = m?.potentialPremium != null ? Number(m.potentialPremium) : null;

  return (
    <div className="py-6 px-4 sm:px-6 space-y-5">

      {/* ── Header — portfolio name + capital baseline ── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        style={{ willChange: "opacity, transform" }}
      >
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {portfolio.name || "Unnamed Portfolio"}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Base capital {dollars(capitalBase)}
        </p>
      </motion.div>

      {/* ── Tab content panel — horizontal swipe switches between tabs ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden" {...swipeHandlers}>

        {activeTab === "Overview" && (
          <div className="p-5 sm:p-6">
            <AccountSummaryContent portfolioId={portfolio.id} embedded />
          </div>
        )}

        {activeTab === "Positions" && (
          <div className="p-5 sm:p-6 space-y-5">

            {/* ── Section header: Open Positions + cash allocation meter ── */}
            {(() => {
              const capitalUsed = m?.capitalUsed != null ? Number(m.capitalUsed) : 0;
              const committed = m?.committed != null ? Number(m.committed) : 0;
              const reserved = m?.reserved != null ? Number(m.reserved) : 0;
              return (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-base font-semibold text-foreground">Open Positions</h2>
                  {capitalUsed > 0 && (
                    <CashAllocationMini
                      currentCapital={currentCapital}
                      committed={committed}
                      reserved={reserved}
                      href={`/ladder?portfolio=${portfolio.id}&name=${encodeURIComponent(portfolio.name ?? "")}`}
                    />
                  )}
                </div>
              );
            })()}

            {/* ── Stock Lots ── */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center px-4 pt-4 pb-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Stock Lots</span>
              </div>
              <StocksTable portfolioId={portfolio.id} totalCapital={currentCapital} />
            </div>

            {/* ── Open Trades ── */}
            <div>
              <div className="flex items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Open Trades</span>
                  {openTrades.length > 0 && (
                    <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">
                      {openTrades.length}
                    </span>
                  )}
                  {potentialPremium != null && potentialPremium > 0 && (
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full leading-none tabular-nums">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(potentialPremium)} open premium
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border bg-card overflow-hidden">
                {loadingOpen ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">Loading positions…</div>
                ) : openTrades.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-12 text-center">
                    <p className="text-sm text-muted-foreground">No open option positions yet.</p>
                    <AddTradeModal portfolioId={portfolio.id} />
                  </div>
                ) : (
                  <OpenTradesTable trades={openTrades} portfolioId={portfolio.id} totalCapital={currentCapital} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Activity" && (
          <div className="bg-card overflow-hidden">
            <ClosedTradesTable portfolioId={portfolio.id} />
          </div>
        )}

        {activeTab === "Report" && (
          <div className="p-5 sm:p-6">
            <AccountsReportContent defaultPortfolioId={portfolio.id} embedded />
          </div>
        )}

      </div>
    </div>
  );
}
