"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import type { QuoteResult } from "@/app/api/quotes/route";
import type { ChartsResponse } from "@/app/api/charts/route";
import { IntradaySparkline } from "@/components/IntradaySparkline";
import { Trade } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metrics } from "@/types";
import {
  TradeNotesSimple,
  type TradeNotesHandle,
} from "@/features/trades/components/TradeNotesSimple";
import CloseTradeModal from "@/features/trades/components/CloseTradeModal";
import AddToTradeModal from "@/features/trades/components/AddToTradeModal";
import { AdminEditTradeModal } from "@/features/trades/components/AdminEditTradeModal";
import { formatDateOnlyUTC, ensureUtcMidnight } from "@/lib/formatDateOnly";
import { capitalUsedForTrade } from "@/lib/tradeMetrics";

type Props = { portfolioId: string; tradeId: string };

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function formatType(type: string) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatCloseReason(reason: string | null | undefined) {
  if (!reason) return null;
  if (reason === "expiredWorthless") return "Expired Worthless";
  if (reason === "assigned") return "Assigned";
  if (reason === "manual") return "Manual";
  return reason;
}

function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase().replace(/[\s_-]/g, "");
  const isCSP = t === "cashsecuredput" || t === "csp";
  const isCoveredCall = t === "coveredcall" || t === "cc";
  const isLongCall = t === "call";
  const isLongPut = t === "put";

  const cls = isCoveredCall
    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
    : isCSP
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      : isLongCall
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : isLongPut
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          : "bg-muted text-muted-foreground border-border";

  return (
    <Badge variant="secondary" className={`border ${cls}`}>
      {formatType(type)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: "open" | "closed" }) {
  return (
    <Badge
      variant="secondary"
      className={
        status === "open"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          : "bg-muted text-muted-foreground border border-border/60"
      }
    >
      {status === "open" ? "Open" : "Closed"}
    </Badge>
  );
}

type Tone = "default" | "success" | "danger" | "warning";

function PrimaryStat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground";

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {sub ? (
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      ) : null}
    </div>
  );
}

type Spec = { label: string; value: string; tone?: Tone };

function toneColor(tone: Tone = "default"): string {
  return tone === "success"
    ? "text-emerald-600 dark:text-emerald-400"
    : tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
}

// Compact two-column key/value table — packs the secondary details into half
// the vertical space the old stacked rows used, with light dividers for a
// scannable table feel.
function SpecList({ items }: { items: Spec[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5"
        >
          <dt className="text-sm text-muted-foreground">{it.label}</dt>
          <dd
            className={`text-sm font-medium tabular-nums ${toneColor(it.tone)}`}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok)
      throw new Error(
        ((await r.json().catch(() => ({}))) as { error?: string }).error ||
          `Failed ${r.status}`,
      );
    return r.json();
  });

export default function TradeDetailPageClient({ portfolioId, tradeId }: Props) {
  const {
    data: trade,
    isLoading,
    mutate,
  } = useSWR<Trade>(`/api/trades/${tradeId}`, fetcher, {
    dedupingInterval: 10_000,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adminEditOpen, setAdminEditOpen] = useState(false);

  // Listen for FAB-dispatched events so the floating action button can open
  // these modals while keeping the mutate callback wired here.
  useEffect(() => {
    const openClose = () => setCloseModalOpen(true);
    const openAdd = () => setAddModalOpen(true);
    const openAdmin = () => setAdminEditOpen(true);
    window.addEventListener("trade:open-close", openClose);
    window.addEventListener("trade:open-add", openAdd);
    window.addEventListener("trade:open-admin", openAdmin);
    return () => {
      window.removeEventListener("trade:open-close", openClose);
      window.removeEventListener("trade:open-add", openAdd);
      window.removeEventListener("trade:open-admin", openAdmin);
    };
  }, []);
  const [notesEditing, setNotesEditing] = useState(false);
  const notesRef = useRef<TradeNotesHandle>(null);

  const { data: quoteData } = useSWR<Record<string, QuoteResult>>(
    trade?.ticker ? `/api/quotes?tickers=${trade.ticker}` : null,
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );
  const quote = trade?.ticker ? quoteData?.[trade.ticker] : undefined;

  const { data: chartData } = useSWR<ChartsResponse>(
    trade?.ticker ? `/api/charts?tickers=${trade.ticker}` : null,
    fetcher,
    { refreshInterval: 300_000, dedupingInterval: 120_000 },
  );
  const intradayCloses = trade?.ticker
    ? chartData?.[trade.ticker]?.closes ?? []
    : [];

  const { data: metrics } = useSWR<Metrics>(
    trade ? `/api/portfolios/${portfolioId}/metrics` : null,
    fetcher,
    { dedupingInterval: 60_000 },
  );


  const daysUntilExpiration = useMemo(() => {
    if (!trade || trade.status !== "open") return null;
    const exp = ensureUtcMidnight(trade.expirationDate).getTime();
    const today = ensureUtcMidnight(new Date()).getTime();
    return Math.max(0, Math.ceil((exp - today) / 86_400_000));
  }, [trade]);

  const daysHeld = useMemo(() => {
    if (!trade || trade.status !== "closed" || !trade.closedAt) return null;
    const closed = ensureUtcMidnight(trade.closedAt).getTime();
    const opened = ensureUtcMidnight(trade.createdAt).getTime();
    return Math.max(0, Math.ceil((closed - opened) / 86_400_000));
  }, [trade]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!trade) {
    return <p className="text-rose-500 p-6">Trade not found.</p>;
  }

  const isOpen = trade.status === "open";
  const t = trade.type.toLowerCase().replace(/[\s_-]/g, "");
  const isCashSecuredPut = t === "cashsecuredput" || t === "csp";
  const isCoveredCall = t === "coveredcall" || t === "cc";
  const isLongPut = t === "put";
  const isLongCall = t === "call";
  // For breakeven and moneyness, CSP and long-put share the put-side formula;
  // CC and long-call share the call-side formula.
  const isPutSide = isCashSecuredPut || isLongPut;
  const isCallSide = isCoveredCall || isLongCall;

  const contractsOpen = trade.contractsOpen ?? trade.contracts ?? 0;
  const contractsInitial = trade.contractsInitial ?? trade.contracts ?? 0;
  const contractsDisplay = isOpen ? contractsOpen : contractsInitial;
  const partiallyFilled = isOpen && contractsOpen !== contractsInitial;

  const openPremium = trade.contractPrice * 100 * contractsOpen;
  const capitalInUse = isOpen
    ? capitalUsedForTrade({
        type: trade.type,
        strikePrice: trade.strikePrice,
        contractsOpen,
        contractPrice: trade.contractPrice,
      })
    : 0;

  const totalCapital = metrics?.currentCapital ?? metrics?.capitalBase ?? metrics?.startingCapital ?? 0;
  const allocPct = totalCapital > 0 && capitalInUse > 0
    ? (capitalInUse / totalCapital) * 100
    : null;
  const breakeven = isPutSide
    ? trade.strikePrice - trade.contractPrice
    : isCoveredCall && trade.entryPrice != null
      ? trade.entryPrice - trade.contractPrice
      : isLongCall
        ? trade.strikePrice + trade.contractPrice
        : null;

  const livePrice = quote?.price ?? null;
  const otmPct =
    isOpen && livePrice != null
      ? isPutSide
        ? ((livePrice - trade.strikePrice) / livePrice) * 100
        : isCallSide
          ? ((trade.strikePrice - livePrice) / livePrice) * 100
          : null
      : null;

  const dteTone: Tone =
    daysUntilExpiration == null
      ? "default"
      : daysUntilExpiration <= 7
        ? "danger"
        : daysUntilExpiration <= 21
          ? "warning"
          : "default";

  const premiumTone: Tone =
    trade.premiumCaptured == null
      ? "default"
      : trade.premiumCaptured > 0
        ? "success"
        : "danger";

  const closeReason = formatCloseReason(trade.closeReason);

  // Return on the capital this trade tied up — CSP collateral or long-option
  // debit. Undefined for covered calls, whose capital lives in the stock lot.
  const capitalForReturn = capitalUsedForTrade({
    type: trade.type,
    strikePrice: trade.strikePrice,
    contractsOpen: isOpen ? contractsOpen : contractsInitial,
    contractPrice: trade.contractPrice,
  });
  const returnOnCapital =
    capitalForReturn > 0
      ? isOpen
        ? (openPremium / capitalForReturn) * 100
        : trade.premiumCaptured != null
          ? (trade.premiumCaptured / capitalForReturn) * 100
          : null
      : null;
  const annualizedReturn =
    !isOpen && returnOnCapital != null && daysHeld != null && daysHeld > 0
      ? returnOnCapital * (365 / daysHeld)
      : null;
  // Annualized return on the collateral if an open position is held to expiry
  // (e.g. a CSP that expires worthless) — the number that makes a quick weekly
  // put and a longer-dated one comparable.
  const openAnnualizedReturn =
    isOpen &&
    returnOnCapital != null &&
    daysUntilExpiration != null &&
    daysUntilExpiration > 0
      ? returnOnCapital * (365 / daysUntilExpiration)
      : null;
  const grossPremiumReceived = trade.contractPrice * 100 * contractsInitial;
  const moneyness =
    otmPct != null
      ? otmPct < 0
        ? `ITM ${Math.abs(otmPct).toFixed(1)}%`
        : `${otmPct.toFixed(1)}% OTM`
      : null;

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

  // Breakeven / if-assigned cost — for a cash-secured put this is the real
  // purchase price you'd pay on assignment (strike minus the premium you
  // collected), the number a wheel trader actually judges the entry on.
  const breakevenLabel = isCashSecuredPut ? "If Assigned" : "Breakeven";
  const assignmentDiscountPct =
    isCashSecuredPut && breakeven != null && livePrice != null && livePrice > 0
      ? ((livePrice - breakeven) / livePrice) * 100
      : null;
  const breakevenSub = isCashSecuredPut
    ? assignmentDiscountPct != null
      ? assignmentDiscountPct >= 0
        ? `${assignmentDiscountPct.toFixed(1)}% below market`
        : `${Math.abs(assignmentDiscountPct).toFixed(1)}% above market`
      : "real cost if assigned"
    : isCoveredCall
      ? "basis after premium"
      : "breakeven price";
  // Color the breakeven by whether the stock sits on the favorable side of it:
  // for a CSP/CC/long call the cushion is price ABOVE breakeven (green); a long
  // put profits below breakeven, so its favorable side is inverted.
  const breakevenAboveIsGood = !isLongPut;
  const breakevenTone: Tone =
    breakeven == null || livePrice == null
      ? "default"
      : (livePrice >= breakeven) === breakevenAboveIsGood
        ? "success"
        : "danger";
  // Strike color tracks desirability, not raw moneyness: a short option (CSP/CC)
  // is happy out of the money, a long option (call/put) is happy in the money,
  // so the long side flips the colors.
  const isLongOption = isLongCall || isLongPut;
  const strikeTone: Tone =
    otmPct == null
      ? "default"
      : isLongOption
        ? otmPct < 0
          ? "success"
          : "danger"
        : otmPct < 0
          ? "danger"
          : "success";

  const detailItems: Spec[] = isOpen
    ? [
        {
          label: "Contracts",
          value: partiallyFilled
            ? `${contractsOpen} open · ${contractsInitial} initial`
            : String(contractsDisplay),
        },
        { label: "Avg Price", value: fmt(trade.contractPrice) },
        { label: "Opened", value: formatDateOnlyUTC(trade.createdAt) },
        { label: "Expiration", value: formatDateOnlyUTC(trade.expirationDate) },
        ...(capitalInUse > 0
          ? [
              {
                label: "Capital In Use",
                value:
                  allocPct != null
                    ? `${fmt(capitalInUse)} · ${allocPct.toFixed(1)}%`
                    : fmt(capitalInUse),
              },
            ]
          : isCoveredCall
            ? [{ label: "Capital In Use", value: "Tied to stock lot" }]
            : []),
        ...(trade.entryPrice != null
          ? [{ label: "Stock Entry Price", value: fmt(trade.entryPrice) }]
          : []),
      ]
    : [
        { label: "Contracts", value: String(contractsDisplay) },
        { label: "Avg Price", value: fmt(trade.contractPrice) },
        { label: "Gross Premium", value: fmt(grossPremiumReceived) },
        { label: "Expiry", value: formatDateOnlyUTC(trade.expirationDate) },
        { label: "Opened", value: formatDateOnlyUTC(trade.createdAt) },
        {
          label: "Closed",
          value: trade.closedAt ? formatDateOnlyUTC(trade.closedAt) : "—",
        },
        ...(closeReason ? [{ label: "Close Reason", value: closeReason }] : []),
        ...(trade.entryPrice != null
          ? [{ label: "Stock Entry Price", value: fmt(trade.entryPrice) }]
          : []),
      ];

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 space-y-6">
      {/* Hero — identity on the left, live price (or close price) on the right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">{trade.ticker}</h1>
            <TypeBadge type={trade.type} />
            <StatusBadge status={trade.status} />
          </div>
          <div className="text-sm text-muted-foreground">
            {contractsDisplay} contract{contractsDisplay !== 1 ? "s" : ""}
            {partiallyFilled ? ` of ${contractsInitial}` : ""}
            <span className="px-1.5 text-muted-foreground/40">·</span>
            {isOpen ? (
              <>
                Exp {formatDateOnlyUTC(trade.expirationDate)}
                <span className="px-1.5 text-muted-foreground/40">·</span>
                {daysUntilExpiration === 0
                  ? "expires today"
                  : `${daysUntilExpiration}d left`}
              </>
            ) : (
              <>
                Closed {trade.closedAt ? formatDateOnlyUTC(trade.closedAt) : "—"}
                {daysHeld != null ? (
                  <>
                    <span className="px-1.5 text-muted-foreground/40">·</span>
                    held {daysHeld}d
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isOpen ? (
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">{priceLabel}</div>
            <div className="text-2xl font-semibold tabular-nums leading-tight">
              {quote?.price != null ? fmt(quote.price) : "—"}
            </div>
            {quote?.change != null && quote?.changePct != null ? (
              <div className={`text-sm font-medium tabular-nums ${dayChangeColor}`}>
                {quote.change >= 0 ? "+" : ""}
                {fmt(quote.change)} ({quote.changePct >= 0 ? "+" : ""}
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
              {trade.closingPrice != null ? fmt(trade.closingPrice) : "Expired"}
            </div>
            <div className="text-sm text-muted-foreground">
              {trade.closingPrice != null
                ? `${fmt(trade.closingPrice * 100 * contractsInitial)} to close`
                : "worthless"}
            </div>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isOpen ? (
          <>
            <PrimaryStat
              label="Strike"
              value={fmt(trade.strikePrice)}
              sub={moneyness ?? undefined}
              tone={strikeTone}
            />
            <PrimaryStat
              label="Premium"
              value={fmt(openPremium)}
              sub={
                returnOnCapital != null
                  ? openAnnualizedReturn != null
                    ? `${returnOnCapital.toFixed(1)}% · ${openAnnualizedReturn.toFixed(0)}%/yr`
                    : `${returnOnCapital.toFixed(1)}% on capital`
                  : `${fmt(trade.contractPrice)}/sh avg`
              }
            />
            <PrimaryStat
              label="Days to Expiry"
              value={
                daysUntilExpiration === 0
                  ? "Today"
                  : daysUntilExpiration != null
                    ? `${daysUntilExpiration}d`
                    : "—"
              }
              sub={formatDateOnlyUTC(trade.expirationDate)}
              tone={dteTone}
            />
            <PrimaryStat
              label={breakevenLabel}
              value={breakeven != null ? fmt(breakeven) : "—"}
              sub={breakeven != null ? breakevenSub : undefined}
              tone={breakevenTone}
            />
          </>
        ) : (
          <>
            <PrimaryStat
              label="Premium Captured"
              value={trade.premiumCaptured != null ? fmt(trade.premiumCaptured) : "—"}
              sub={
                trade.percentPL != null
                  ? `${trade.percentPL >= 0 ? "+" : ""}${trade.percentPL.toFixed(1)}% P/L`
                  : undefined
              }
              tone={premiumTone}
            />
            <PrimaryStat
              label="Strike"
              value={fmt(trade.strikePrice)}
              sub={`${fmt(trade.contractPrice)}/sh avg`}
            />
            <PrimaryStat
              label="Return on Capital"
              value={
                returnOnCapital != null
                  ? `${returnOnCapital >= 0 ? "+" : ""}${returnOnCapital.toFixed(1)}%`
                  : "—"
              }
              sub={
                annualizedReturn != null
                  ? `${annualizedReturn >= 0 ? "+" : ""}${annualizedReturn.toFixed(0)}% annualized`
                  : isCoveredCall
                    ? "tied to stock lot"
                    : undefined
              }
              tone={
                returnOnCapital == null
                  ? "default"
                  : returnOnCapital >= 0
                    ? "success"
                    : "danger"
              }
            />
            <PrimaryStat
              label="Days Held"
              value={daysHeld != null ? `${daysHeld}d` : "—"}
              sub={closeReason ?? undefined}
            />
          </>
        )}
      </div>

      {/* Secondary details card */}
      <Card className="p-4 sm:p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Details
        </div>
        <SpecList items={detailItems} />
      </Card>

      {/* Notes card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Notes
          </div>
          {!notesEditing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => notesRef.current?.startEditing()}
            >
              Edit
            </Button>
          ) : null}
        </div>
        <TradeNotesSimple
          ref={notesRef}
          tradeId={tradeId}
          initialNotes={trade.notes ?? ""}
          hideHeader
          onEditingChange={setNotesEditing}
        />
      </Card>

      {/* Modals */}
      {isAdmin && trade && (
        <AdminEditTradeModal
          trade={trade}
          open={adminEditOpen}
          onClose={() => setAdminEditOpen(false)}
          onSaved={() => mutate()}
        />
      )}
      {isOpen ? (
        <>
          <CloseTradeModal
            id={trade.id}
            portfolioId={portfolioId}
            isOpen={closeModalOpen}
            onClose={() => setCloseModalOpen(false)}
            strikePrice={trade.strikePrice}
            contracts={contractsOpen}
            ticker={trade.ticker}
            expirationDate={String(trade.expirationDate)}
            type={trade.type}
            refresh={() => mutate()}
          />
          <AddToTradeModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            tradeId={trade.id}
            portfolioId={portfolioId}
            currentContracts={contractsOpen}
            avgContractPrice={trade.contractPrice}
            ticker={trade.ticker}
            onUpdated={() => mutate()}
          />
        </>
      ) : null}
    </div>
  );
}
