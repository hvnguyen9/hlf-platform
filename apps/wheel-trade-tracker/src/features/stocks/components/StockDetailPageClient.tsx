"use client";

import * as React from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { StockLot } from "@/types";
import type { QuoteResult } from "@/app/api/quotes/route";
import type { ChartsResponse } from "@/app/api/charts/route";
import { IntradaySparkline } from "@/components/IntradaySparkline";
import { CloseStockLotModal } from "./CloseStockModal";
import { AddSharesModal } from "./AddSharesModal";
import { AdminEditStockModal } from "./AdminEditStockModal";
import { LotNotesCard } from "./LotNotesCard";
import { useSession } from "next-auth/react";

type StockResponse = {
  stockLot: StockLot;
  effectiveBasis?: {
    cspPremiumDuringHold: number;
    cspPendingPremium: number;
    longOptionPnlDuringHold: number;
    effectiveAvgCost: number;
  };
};

type CoveredCallRow = {
  id: string;
  expirationDate: string | Date;
  strikePrice: number;
  contracts: number;
  contractsOpen: number;
  contractPrice: number;
  status: string;
  premiumCaptured: number | null;
  openedAt: string;
  closedAt: string | null;
};

type AvgCostSnapshot = { before: number; after: number };

function buildAvgCostHistory(
  coveredCalls: CoveredCallRow[],
  currentAvg: number,
  shares: number,
): Record<string, AvgCostSnapshot> {
  const closed = coveredCalls
    .filter((cc) => cc.status.toLowerCase() !== "open" && cc.premiumCaptured != null)
    .sort((a, b) => {
      const ta = a.closedAt ? new Date(a.closedAt).getTime() : 0;
      const tb = b.closedAt ? new Date(b.closedAt).getTime() : 0;
      return ta - tb;
    });

  const totalCaptured = closed.reduce((s, cc) => s + (cc.premiumCaptured ?? 0), 0);
  let running = shares > 0 ? currentAvg + totalCaptured / shares : currentAvg;

  const history: Record<string, AvgCostSnapshot> = {};
  for (const cc of closed) {
    const reduction = shares > 0 ? (cc.premiumCaptured ?? 0) / shares : 0;
    history[cc.id] = { before: running, after: running - reduction };
    running -= reduction;
  }
  return history;
}

const fetcher = async (url: string): Promise<StockResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load stock");
  return (await res.json()) as StockResponse;
};

const quoteFetcher = async (url: string): Promise<Record<string, QuoteResult>> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json() as Promise<Record<string, QuoteResult>>;
};

const chartFetcher = async (url: string): Promise<ChartsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch charts");
  return res.json() as Promise<ChartsResponse>;
};

function toNumber(v: string | number): number {
  return typeof v === "number" ? v : Number(v);
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function moneyCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return money(n);
}

function formatStrike(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function daysUntil(date: string | Date): number {
  const exp = new Date(date);
  exp.setHours(23, 59, 59, 0);
  const now = new Date();
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function StatusBadge(props: { status: string }) {
  const s = (props.status ?? "").toUpperCase();
  const isOpen = s === "OPEN";
  const label = isOpen ? "Open" : "Closed";

  return (
    <Badge
      variant="secondary"
      className={
        isOpen
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          : "bg-muted text-muted-foreground border border-border/60"
      }
    >
      {label}
    </Badge>
  );
}


function LotStat({
  label,
  value,
  sub,
  subNode,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  subNode?: React.ReactNode;
  tone?: "default" | "success" | "danger";
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${valueColor}`}>{value}</div>
      {subNode ? <div className="mt-0.5">{subNode}</div> : sub ? <div className="text-xs text-muted-foreground mt-0.5">{sub}</div> : null}
    </div>
  );
}

function buildColumns(
  portfolioId: string,
  shares: number,
  router: ReturnType<typeof useRouter>,
  avgCostHistory: Record<string, AvgCostSnapshot>,
  currentAvg: number,
): ColumnDef<CoveredCallRow>[] {
  return [
    {
      accessorKey: "expirationDate",
      header: "Exp",
      cell: ({ row }) => {
        const d = row.original.expirationDate;
        const isOpen = row.original.status.toLowerCase() === "open";
        const dte = daysUntil(d);
        return (
          <div>
            <div className="font-medium">{new Date(d).toLocaleDateString()}</div>
            {isOpen ? (
              <div
                className={`text-xs tabular-nums ${dte <= 7 ? "text-rose-500" : dte <= 21 ? "text-amber-500" : "text-muted-foreground"}`}
              >
                {dte > 0 ? `${dte}d` : dte === 0 ? "exp today" : "expired"}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "strikePrice",
      header: "Strike",
      cell: ({ row }) => formatStrike(safeNumber(row.original.strikePrice)),
    },
    {
      accessorKey: "contracts",
      header: "Qty",
      cell: ({ row }) => safeNumber(row.original.contracts),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={String(row.original.status)} />,
    },
    {
      id: "costImpact",
      header: () => <div className="text-right">Avg Cost</div>,
      cell: ({ row }) => {
        const { id, status, contractPrice, contracts, premiumCaptured } =
          row.original;
        const isOpen = status.toLowerCase() === "open";

        if (isOpen) {
          const potential = (contractPrice * 100 * contracts) / shares;
          const projected = currentAvg - potential;
          return (
            <div className="text-right tabular-nums text-xs space-y-0.5">
              <div className="text-muted-foreground">{moneyCompact(currentAvg)}</div>
              <div className="text-emerald-600 dark:text-emerald-400">
                → ~{moneyCompact(projected)}
              </div>
            </div>
          );
        }

        const snap = avgCostHistory[id];
        const captured = premiumCaptured ?? 0;
        const perShare = shares > 0 ? captured / shares : 0;

        return (
          <div className="text-right tabular-nums text-xs space-y-0.5">
            {snap ? (
              <>
                <div className="text-muted-foreground line-through">{moneyCompact(snap.before)}</div>
                <div className="text-emerald-600 dark:text-emerald-400">→ {moneyCompact(snap.after)}</div>
              </>
            ) : (
              <div className="text-emerald-600 dark:text-emerald-400">-{moneyCompact(perShare)}/sh</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "premiumCaptured",
      header: () => <div className="text-right">Premium</div>,
      cell: ({ row }) => {
        const { status, contractPrice, contracts, premiumCaptured } =
          row.original;
        const isOpen = status.toLowerCase() === "open";

        if (isOpen) {
          const potential = contractPrice * 100 * contracts;
          return (
            <div className="text-right tabular-nums text-muted-foreground text-xs">
              ~{money(potential)}
            </div>
          );
        }

        const maxPremium =
          contractPrice > 0 ? contractPrice * 100 * contracts : null;
        const captured = premiumCaptured ?? 0;
        const pct =
          maxPremium && maxPremium > 0
            ? Math.round((captured / maxPremium) * 100)
            : null;
        const color =
          captured > 0
            ? "text-emerald-600 dark:text-emerald-400"
            : captured < 0
              ? "text-rose-600 dark:text-rose-400"
              : "";

        return (
          <div className={`text-right tabular-nums ${color}`}>
            <div>{money(captured)}</div>
            {pct !== null ? (
              <div className="text-xs text-muted-foreground">{pct}% of max</div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "link",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(
              `/portfolios/${portfolioId}/trades/${row.original.id}`,
            );
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          aria-label="View position"
        >
          →
        </button>
      ),
    },
  ];
}

export default function StockDetailPageClient(props: {
  portfolioId: string;
  stockId: string;
}) {
  const { portfolioId, stockId } = props;
  const router = useRouter();

  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const [closeOpen, setCloseOpen] = React.useState<boolean>(false);
  const [adminEditOpen, setAdminEditOpen] = React.useState(false);
  const [addSharesOpen, setAddSharesOpen] = React.useState(false);

  // Listen for FAB-dispatched events so the floating action button can open
  // these modals while keeping the mutate callback wired here.
  React.useEffect(() => {
    const openClose = () => setCloseOpen(true);
    const openAdd = () => setAddSharesOpen(true);
    const openAdmin = () => setAdminEditOpen(true);
    window.addEventListener("stock:open-close", openClose);
    window.addEventListener("stock:open-add", openAdd);
    window.addEventListener("stock:open-admin", openAdmin);
    return () => {
      window.removeEventListener("stock:open-close", openClose);
      window.removeEventListener("stock:open-add", openAdd);
      window.removeEventListener("stock:open-admin", openAdmin);
    };
  }, []);

  const { data, error, isLoading, mutate } = useSWR<StockResponse>(
    `/api/stocks/${stockId}`,
    fetcher,
  );


  const stockLot = data?.stockLot;

  const coveredCalls: CoveredCallRow[] = React.useMemo(() => {
    const trades = stockLot?.trades ?? [];
    return trades
      .filter((t) => t.type === "CoveredCall")
      .map((t) => ({
        id: t.id,
        expirationDate: t.expirationDate,
        strikePrice: safeNumber(t.strikePrice),
        contracts: safeNumber(t.contracts ?? t.contractsInitial),
        contractsOpen: safeNumber(t.contractsOpen ?? t.contracts ?? t.contractsInitial),
        contractPrice: safeNumber(t.contractPrice),
        status: String(t.status),
        premiumCaptured:
          typeof t.premiumCaptured === "number" ? t.premiumCaptured : null,
        openedAt: t.createdAt,
        closedAt: t.closedAt ?? null,
      }));
  }, [stockLot?.trades]);

  const shares = safeNumber(stockLot?.shares ?? 0);
  const avg = toNumber(stockLot?.avgCost ?? 0);
  const cspPremiumDuringHold = data?.effectiveBasis?.cspPremiumDuringHold ?? 0;
  const cspPendingPremium = data?.effectiveBasis?.cspPendingPremium ?? 0;
  const longOptionPnlDuringHold = data?.effectiveBasis?.longOptionPnlDuringHold ?? 0;
  const effectiveAvgCost = data?.effectiveBasis?.effectiveAvgCost ?? avg;
  const hasCspBoost = cspPremiumDuringHold > 0 && shares > 0;
  const hasLongPnl = Math.abs(longOptionPnlDuringHold) > 0.005 && shares > 0;

  const { data: quoteData } = useSWR<Record<string, QuoteResult>>(
    stockLot?.ticker ? `/api/quotes?tickers=${stockLot.ticker}` : null,
    quoteFetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );
  const quote = stockLot?.ticker ? quoteData?.[stockLot.ticker] : undefined;

  const { data: chartData } = useSWR<ChartsResponse>(
    stockLot?.ticker ? `/api/charts?tickers=${stockLot.ticker}` : null,
    chartFetcher,
    { refreshInterval: 300_000, dedupingInterval: 120_000 },
  );
  const intradayCloses = stockLot?.ticker
    ? chartData?.[stockLot.ticker]?.closes ?? []
    : [];

  const avgCostHistory = React.useMemo(
    () => buildAvgCostHistory(coveredCalls, avg, shares),
    [coveredCalls, avg, shares],
  );

  const columns = React.useMemo(
    () => buildColumns(portfolioId, shares, router, avgCostHistory, avg),
    [portfolioId, shares, router, avgCostHistory, avg],
  );

  const table = useReactTable({
    data: coveredCalls,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // CC summary metrics
  const ccMetrics = React.useMemo(() => {
    const closed = coveredCalls.filter(
      (cc) => cc.status.toLowerCase() !== "open",
    );
    const open = coveredCalls.filter(
      (cc) => cc.status.toLowerCase() === "open",
    );

    const totalCaptured = closed.reduce(
      (sum, cc) => sum + (cc.premiumCaptured ?? 0),
      0,
    );
    const pendingPremium = open.reduce(
      (sum, cc) => sum + cc.contractPrice * 100 * cc.contracts,
      0,
    );

    return { totalCaptured, pendingPremium, openCount: open.length, closedCount: closed.length };
  }, [coveredCalls]);

  const openCcShares = React.useMemo(
    () =>
      coveredCalls
        .filter((cc) => cc.status.toLowerCase() === "open")
        .reduce((sum, cc) => sum + cc.contractsOpen * 100, 0),
    [coveredCalls],
  );

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (error || !stockLot) {
    return (
      <div className="p-6 text-sm text-destructive">Failed to load stock.</div>
    );
  }

  const s = stockLot;
  const { totalCaptured, pendingPremium, closedCount } = ccMetrics;
  const originalAvg =
    totalCaptured > 0 ? avg + totalCaptured / shares : null;
  // Combined "if all open premiums get captured" projection: sums pending CC
  // premium (open CCs against this lot) and pending CSP premium (open CSPs on
  // the same ticker/portfolio). One forward-looking sell-floor instead of two.
  const totalPendingPremium = pendingPremium + cspPendingPremium;
  const adjAvgIfAllCapture =
    totalPendingPremium > 0 && shares > 0
      ? Math.max(0, effectiveAvgCost - totalPendingPremium / shares)
      : null;

  const isClosed = String(s.status).toUpperCase() === "CLOSED";
  const realizedPnl = safeNumber(s.realizedPnl);

  // Headline position metrics — all derived from data already on the page so
  // the detail view tells the whole story at a glance.
  const price = quote?.price ?? null;
  const displayedOriginal = originalAvg ?? avg;
  const originalCostTotal = displayedOriginal * shares;
  const effectiveBasisTotal = effectiveAvgCost * shares;
  const marketValue = price != null ? price * shares : null;
  const unrealized =
    !isClosed && marketValue != null ? marketValue - effectiveBasisTotal : null;
  const unrealizedPct =
    unrealized != null && effectiveBasisTotal > 0
      ? (unrealized / effectiveBasisTotal) * 100
      : null;
  // Money in the door from selling premium against this lot — closed CC
  // premiums (already baked into avgCost) plus CSP premium captured during hold.
  const premiumIncome = totalCaptured + cspPremiumDuringHold;
  const yieldOnCost =
    originalCostTotal > 0 ? (premiumIncome / originalCostTotal) * 100 : null;
  const holdEnd = isClosed && s.closedAt ? new Date(s.closedAt) : new Date();
  const daysHeld = Math.max(
    0,
    Math.round((holdEnd.getTime() - new Date(s.openedAt).getTime()) / 86_400_000),
  );
  const freeShares = Math.max(0, shares - openCcShares);
  const coveredPct = shares > 0 ? Math.min(100, (openCcShares / shares) * 100) : 0;
  const closePriceNum = s.closePrice != null ? toNumber(s.closePrice) : null;
  const writableCcs = Math.floor(freeShares / 100);

  const priceLabel =
    quote?.marketState && quote.marketState !== "REGULAR"
      ? quote.marketState === "PRE"
        ? "Pre-Market"
        : quote.marketState === "POST" || quote.marketState === "POSTPOST"
          ? "After Hours"
          : "Last Close"
      : "Live Price";
  const dayChangeColor =
    quote?.change == null
      ? "text-muted-foreground"
      : quote.change > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : quote.change < 0
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      {/* Hero — identity on the left, live price (or close price) on the right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{s.ticker}</h1>
            <StatusBadge status={String(s.status)} />
          </div>
          <div className="text-sm text-muted-foreground">
            {shares} share{shares !== 1 ? "s" : ""}
            <span className="px-1.5 text-muted-foreground/40">·</span>
            Opened {new Date(s.openedAt).toLocaleDateString()}
            <span className="px-1.5 text-muted-foreground/40">·</span>
            {daysHeld}d held
          </div>
        </div>

        {!isClosed ? (
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">{priceLabel}</div>
            <div className="text-2xl font-semibold tabular-nums leading-tight">
              {price != null ? moneyCompact(price) : "—"}
            </div>
            {quote?.change != null && quote?.changePct != null ? (
              <div className={`text-sm font-medium tabular-nums ${dayChangeColor}`}>
                {quote.change >= 0 ? "+" : ""}
                {moneyCompact(quote.change)} ({quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%)
              </div>
            ) : null}
            {intradayCloses.length >= 3 ? (
              <div className="mt-2 flex sm:justify-end">
                <IntradaySparkline
                  closes={intradayCloses}
                  up={(quote?.change ?? 0) >= 0}
                  prevClose={quote?.previousClose ?? null}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">Close Price</div>
            <div className="text-2xl font-semibold tabular-nums leading-tight">
              {closePriceNum != null ? moneyCompact(closePriceNum) : "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              Closed {s.closedAt ? new Date(s.closedAt).toLocaleDateString() : "—"}
            </div>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {!isClosed ? (
          <>
            <LotStat
              label="Market Value"
              value={marketValue != null ? money(marketValue) : "—"}
              sub={
                price != null
                  ? `${shares} × ${moneyCompact(price)}`
                  : `${shares} shares`
              }
            />
            <LotStat
              label="Cost Basis"
              value={money(effectiveBasisTotal)}
              sub={`${moneyCompact(effectiveAvgCost)}/sh · sell floor`}
            />
            <LotStat
              label="Unrealized P/L"
              value={
                unrealized != null
                  ? `${unrealized >= 0 ? "+" : ""}${money(unrealized)}`
                  : "—"
              }
              tone={
                unrealized == null ? "default" : unrealized >= 0 ? "success" : "danger"
              }
              sub={
                unrealizedPct != null
                  ? `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(1)}% vs basis`
                  : undefined
              }
            />
            <LotStat
              label="Premium Income"
              value={premiumIncome !== 0 ? money(premiumIncome) : "—"}
              tone={premiumIncome > 0 ? "success" : "default"}
              sub={
                yieldOnCost != null && premiumIncome !== 0
                  ? `${yieldOnCost.toFixed(1)}% yield on cost`
                  : "CC + CSP captured"
              }
            />
            {realizedPnl !== 0 ? (
              <LotStat
                label="Realized P/L"
                value={formatMoney(realizedPnl)}
                tone={
                  realizedPnl > 0 ? "success" : realizedPnl < 0 ? "danger" : "default"
                }
                sub="from partial sells"
              />
            ) : null}
          </>
        ) : (
          <>
            <LotStat
              label="Realized P/L"
              value={formatMoney(realizedPnl)}
              tone={
                realizedPnl > 0 ? "success" : realizedPnl < 0 ? "danger" : "default"
              }
            />
            <LotStat
              label="Premium Income"
              value={premiumIncome !== 0 ? money(premiumIncome) : "—"}
              tone={premiumIncome > 0 ? "success" : "default"}
              sub={
                yieldOnCost != null && premiumIncome !== 0
                  ? `${yieldOnCost.toFixed(1)}% yield on cost`
                  : "CC + CSP captured"
              }
            />
            <LotStat
              label="Effective Cost / Share"
              value={moneyCompact(effectiveAvgCost)}
              sub={`${money(effectiveBasisTotal)} basis`}
            />
            <LotStat label="Days Held" value={`${daysHeld}d`} sub={`${shares} shares`} />
          </>
        )}
      </div>

      {/* Cost Basis via Premiums — Original Avg (tax basis) → Effective Basis
          (mental sell-floor) with CC + CSP + Long-option breakdown. CC
          reductions are already baked into avgCost; CSP premiums and long
          option P&L during the hold are display-only and never mutate
          avgCost (long options treated as conviction P&L on the underlying). */}
      {coveredCalls.length > 0 || hasCspBoost || cspPendingPremium > 0 || hasLongPnl ? (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Cost Basis via Premiums
              </h2>
              <div className="text-xs text-muted-foreground mt-0.5">
                Opened {new Date(s.openedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {closedCount > 0 ? (
                <span>{closedCount} CC{closedCount !== 1 ? "s" : ""} closed</span>
              ) : null}
              {hasCspBoost ? (
                <span>{money(cspPremiumDuringHold)} CSP captured</span>
              ) : null}
              {hasLongPnl ? (
                <span className={longOptionPnlDuringHold >= 0 ? "" : "text-red-500"}>
                  {longOptionPnlDuringHold >= 0 ? "+" : ""}{money(longOptionPnlDuringHold)} long options
                </span>
              ) : null}
            </div>
          </div>

          {totalCaptured === 0 && adjAvgIfAllCapture === null && !hasCspBoost && !hasLongPnl ? (
            <p className="text-sm text-muted-foreground">
              Close covered calls, sell CSPs, or close long options on this ticker to see cost basis reduction here.
            </p>
          ) : (
            (() => {
              // displayedOriginal = what you paid (tax basis). When CCs have
              // already reduced avgCost, originalAvg recovers it; when no CCs
              // have closed yet, avg itself is the original.
              const displayedOriginal = originalAvg ?? avg;
              const reductionPerShare = displayedOriginal - effectiveAvgCost;
              const reductionPct =
                displayedOriginal > 0
                  ? (reductionPerShare / displayedOriginal) * 100
                  : 0;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Original Avg</div>
                    <div className="text-xl font-bold tabular-nums text-muted-foreground">
                      {moneyCompact(displayedOriginal)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      tax basis · what you paid
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Effective Basis</div>
                    <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {moneyCompact(effectiveAvgCost)}
                    </div>
                    {reductionPerShare > 0 ? (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {reductionPct.toFixed(1)}% lower · sell-floor
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-0.5">sell-floor</div>
                    )}
                  </div>

                  {totalCaptured > 0 ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">CC Premiums</div>
                      <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {money(totalCaptured)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        -{moneyCompact(totalCaptured / shares)}/share
                      </div>
                    </div>
                  ) : null}

                  {hasCspBoost ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">CSP Premiums</div>
                      <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {money(cspPremiumDuringHold)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        -{moneyCompact(cspPremiumDuringHold / shares)}/share during hold
                      </div>
                    </div>
                  ) : null}

                  {hasLongPnl ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Long Options</div>
                      <div
                        className={`text-xl font-bold tabular-nums ${
                          longOptionPnlDuringHold >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {longOptionPnlDuringHold >= 0 ? "+" : ""}
                        {money(longOptionPnlDuringHold)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {longOptionPnlDuringHold >= 0 ? "-" : "+"}
                        {moneyCompact(Math.abs(longOptionPnlDuringHold) / shares)}/share during hold
                      </div>
                    </div>
                  ) : null}

                  {adjAvgIfAllCapture !== null ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        If All Open Expire
                      </div>
                      <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {moneyCompact(adjAvgIfAllCapture)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {money(totalPendingPremium)} pending
                        {pendingPremium > 0 && cspPendingPremium > 0
                          ? ` (${money(pendingPremium)} CC + ${money(cspPendingPremium)} CSP)`
                          : pendingPremium > 0
                            ? " (CC)"
                            : " (CSP)"}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()
          )}

        </Card>
      ) : null}

      {/* Share coverage — how many shares are written against vs free to sell
          another covered call. Surfaces the next actionable move on the lot. */}
      {!isClosed && shares > 0 ? (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Share Coverage
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {openCcShares} of {shares} covered
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500/70"
              style={{ width: `${coveredPct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/70" />
              {openCcShares} covered by open CCs
            </span>
            <span className="text-muted-foreground tabular-nums">
              {freeShares} free
              {writableCcs >= 1
                ? ` · can write ${writableCcs} more CC${writableCcs !== 1 ? "s" : ""}`
                : ""}
            </span>
          </div>
        </Card>
      ) : null}

      <LotNotesCard stockId={stockId} notes={s.notes ?? null} canEdit={!isClosed} />

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Covered Calls</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Covered calls sold against this stock lot. Click a row to view the position.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border/60">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={
                        "h-10 px-2 text-left align-middle font-medium text-muted-foreground " +
                        (header.column.id === "premiumCaptured" ||
                        header.column.id === "costImpact"
                          ? "text-right"
                          : "") +
                        (header.column.id === "expirationDate"
                          ? " w-[140px]"
                          : "")
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr className="border-b border-border/60">
                  <td
                    colSpan={columns.length}
                    className="h-24 px-2 text-center text-sm text-muted-foreground"
                  >
                    No covered calls linked yet.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 hover:bg-muted/30 cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/portfolios/${portfolioId}/trades/${row.original.id}`,
                      )
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={
                          "p-2 align-middle " +
                          (cell.column.id === "premiumCaptured" ||
                          cell.column.id === "costImpact"
                            ? "text-right"
                            : "")
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {String(s.status).toUpperCase() === "OPEN" ? (
        <>
          <CloseStockLotModal
            open={closeOpen}
            onOpenChange={setCloseOpen}
            stockId={stockId}
            portfolioId={portfolioId}
            ticker={s.ticker}
            shares={shares}
            avgCost={toNumber(s.avgCost)}
            openCcShares={openCcShares}
          />
          <AddSharesModal
            open={addSharesOpen}
            onOpenChange={setAddSharesOpen}
            stockId={stockId}
            portfolioId={portfolioId}
            ticker={s.ticker}
            shares={shares}
            avgCost={toNumber(s.avgCost)}
          />
        </>
      ) : null}

      {isAdmin && stockLot && (
        <AdminEditStockModal
          stockLot={stockLot}
          open={adminEditOpen}
          onClose={() => setAdminEditOpen(false)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
