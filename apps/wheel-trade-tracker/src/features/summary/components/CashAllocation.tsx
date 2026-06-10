"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateOnlyUTC } from "@/lib/formatDateOnly";
import {
  buildAssignmentLadder,
  type LadderCsp,
} from "@/lib/assignmentLadder";

type QuoteMap = Record<
  string,
  { price: number | null; change: number | null; changePct: number | null; marketState?: string | null }
>;

const fmtLong = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);

const isCSP = (type: string) => {
  const t = type.toLowerCase().replace(/\s/g, "");
  return t === "cashsecuredput" || t === "csp";
};

export type AllocTrade = {
  id: string;
  ticker: string;
  type: string;
  strikePrice: number;
  contractsOpen: number;
  expirationDate: string;
  collateral: number;
};

const COMMITTED_COLOR = "hsl(160 84% 32%)";
const RESERVED_COLOR = "hsl(38 92% 50%)";
const RESERVED_STRIPES =
  "repeating-linear-gradient(45deg, hsl(38 92% 60%), hsl(38 92% 60%) 6px, hsl(38 92% 50%) 6px, hsl(38 92% 50%) 12px)";

// ── Shared segmented bar — committed / reserved / free ──
export function CashAllocationBar({
  currentCapital,
  committed,
  reserved,
  height = "h-8",
  showPctLabels = true,
}: {
  currentCapital: number;
  committed: number;
  reserved: number;
  height?: string;
  showPctLabels?: boolean;
}) {
  const free = currentCapital - committed - reserved;
  const denom = Math.max(1, currentCapital);
  const pct = (v: number) => Math.max(0, (v / denom) * 100);
  const committedPct = pct(committed);
  const reservedPct = pct(reserved);
  const freePct = Math.max(0, 100 - committedPct - reservedPct);

  return (
    <div className={cn("flex rounded-lg overflow-hidden bg-muted", height)}>
      {committedPct > 0 && (
        <div
          className="flex items-center justify-center text-[11px] font-medium text-white"
          style={{ width: `${committedPct}%`, backgroundColor: COMMITTED_COLOR }}
          title={`Committed ${fmtLong(committed)}`}
        >
          {showPctLabels && committedPct > 12 ? `${Math.round(committedPct)}%` : ""}
        </div>
      )}
      {reservedPct > 0 && (
        <div
          className="flex items-center justify-center text-[11px] font-medium text-amber-950"
          style={{ width: `${reservedPct}%`, backgroundImage: RESERVED_STRIPES }}
          title={`Reserved ${fmtLong(reserved)}`}
        >
          {showPctLabels && reservedPct > 12 ? `${Math.round(reservedPct)}%` : ""}
        </div>
      )}
      {freePct > 0 && (
        <div
          className="flex items-center justify-center text-[11px] font-medium text-muted-foreground"
          style={{ width: `${freePct}%` }}
          title={`Free ${fmtLong(free)}`}
        >
          {showPctLabels && freePct > 12 ? `${Math.round(freePct)}%` : ""}
        </div>
      )}
    </div>
  );
}

// ── Compact meter for the Positions header — thin bar + inline legend ──
export function CashAllocationMini({
  currentCapital,
  committed,
  reserved,
}: {
  currentCapital: number;
  committed: number;
  reserved: number;
}) {
  const free = currentCapital - committed - reserved;
  return (
    <div className="w-44 sm:w-56 space-y-1.5">
      <CashAllocationBar
        currentCapital={currentCapital}
        committed={committed}
        reserved={reserved}
        height="h-2"
        showPctLabels={false}
      />
      <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
        <MiniLegend color={COMMITTED_COLOR} label="Committed" value={committed} />
        <MiniLegend stripes label="Reserved" value={reserved} />
        <MiniLegend muted label="Free" value={free} valueClass={free < 0 ? "text-red-600 dark:text-red-400" : undefined} />
      </div>
    </div>
  );
}

function MiniLegend({
  color,
  stripes,
  muted,
  label,
  value,
  valueClass,
}: {
  color?: string;
  stripes?: boolean;
  muted?: boolean;
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span
        className={cn("w-1.5 h-1.5 rounded-sm shrink-0", muted && "bg-muted-foreground/40")}
        style={
          stripes
            ? { backgroundImage: RESERVED_STRIPES }
            : color
              ? { backgroundColor: color }
              : undefined
        }
      />
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={cn("font-medium text-foreground", valueClass)}>{fmtCompact(value)}</span>
    </div>
  );
}

// ── Segmented cash allocation bar + three metric tiles ──
export function CashAllocationCard({
  currentCapital,
  committed,
  reserved,
}: {
  currentCapital: number;
  committed: number;
  reserved: number;
}) {
  const free = currentCapital - committed - reserved;
  const negativeFree = free < 0;

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-foreground">Cash Allocation</h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Account capital {fmtLong(currentCapital)}
          </span>
        </div>

        <div className="mb-4">
          <CashAllocationBar currentCapital={currentCapital} committed={committed} reserved={reserved} />
        </div>

        {/* Three tiles */}
        <div className="grid grid-cols-3 gap-3">
          <AllocTile
            dot={COMMITTED_COLOR}
            label="Committed"
            value={committed}
            hint="Stock lots + LEAPs"
          />
          <AllocTile
            dot={RESERVED_COLOR}
            label="Reserved"
            value={reserved}
            hint="CSPs — if assigned"
          />
          <AllocTile
            dotMuted
            label="Free"
            value={free}
            hint={negativeFree ? "Over-deployed" : "Unencumbered"}
            valueClass={negativeFree ? "text-red-600 dark:text-red-400" : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AllocTile({
  dot,
  dotMuted,
  label,
  value,
  hint,
  valueClass,
}: {
  dot?: string;
  dotMuted?: boolean;
  label: string;
  value: number;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={cn("w-2 h-2 rounded-sm", dotMuted && "bg-muted-foreground/50")}
          style={dot ? { backgroundColor: dot } : undefined}
        />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-lg font-bold tabular-nums text-foreground", valueClass)}>{fmtLong(value)}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

// ── Assignment ladder: forward CSP expirations and the running liquid cash ──
export function AssignmentLadderCard({
  currentCapital,
  committed,
  trades,
  quotes,
  collapsible = true,
  detailHref,
  cardCollapsible = false,
  defaultOpen = true,
}: {
  currentCapital: number;
  committed: number;
  trades: AllocTrade[];
  quotes: QuoteMap;
  collapsible?: boolean;
  detailHref?: string;
  cardCollapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cardOpen, setCardOpen] = useState(defaultOpen);

  const csps: LadderCsp[] = trades
    .filter((t) => isCSP(t.type))
    .map((t) => ({
      id: t.id,
      ticker: t.ticker,
      strikePrice: t.strikePrice,
      contractsOpen: t.contractsOpen,
      expirationDate: t.expirationDate,
      collateral: t.collateral,
    }));

  const ladder = buildAssignmentLadder({
    currentCapital,
    committed,
    csps,
    itmFor: (c) => {
      const price = quotes[c.ticker]?.price;
      if (price == null) return null;
      return price < c.strikePrice; // a put is ITM when the stock is below strike
    },
  });

  if (csps.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-5">
          <h2 className="text-base font-semibold text-foreground mb-1">Assignment Ladder</h2>
          <p className="text-sm text-muted-foreground py-4 text-center">No open cash-secured puts.</p>
        </CardContent>
      </Card>
    );
  }

  const visibleRows = collapsible && !expanded ? ladder.rows.slice(0, 4) : ladder.rows;
  const hiddenCount = ladder.rows.length - visibleRows.length;

  const body = (
    <>
        <p className="text-[11px] text-muted-foreground mb-4">
          Liquid cash today {fmtLong(ladder.baseline)} · {fmtLong(ladder.totalReserved)} reserved across{" "}
          {csps.length} put{csps.length !== 1 ? "s" : ""}. Running free assumes each assigns on its date.
        </p>

        {/* Header */}
        <div className="hidden sm:grid grid-cols-[88px_1fr_110px_120px] gap-3 px-2 pb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <span>Expiry</span>
          <span>Positions</span>
          <span className="text-right">Deploys</span>
          <span className="text-right">Free after</span>
        </div>

        <div className="space-y-px">
          {visibleRows.map((row) => (
            <div
              key={row.date}
              className="grid grid-cols-2 sm:grid-cols-[88px_1fr_110px_120px] gap-x-3 gap-y-1.5 items-center px-2 py-2.5 border-t border-border/40"
            >
              <span className="text-[13px] font-semibold text-foreground tabular-nums">
                {formatDateOnlyUTC(row.date)}
              </span>
              <div className="flex flex-wrap gap-1.5 order-last sm:order-none col-span-2 sm:col-span-1">
                {row.positions.map((p) => (
                  <span
                    key={p.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                      p.itm
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        : "bg-muted text-muted-foreground",
                    )}
                    title={p.itm ? "In the money — likely to assign" : p.itm === false ? "Out of the money" : "Quote unavailable"}
                  >
                    {p.ticker} ${p.strikePrice}p ×{p.contractsOpen}
                    {p.itm ? " ITM" : ""}
                  </span>
                ))}
              </div>
              <span className="text-[13px] text-foreground tabular-nums text-right">{fmtCompact(row.deploys)}</span>
              <span
                className={cn(
                  "text-[13px] font-medium tabular-nums text-right",
                  row.breached ? "text-red-600 dark:text-red-400" : "text-foreground",
                )}
              >
                {row.freeAfter < 0 ? "−" : ""}
                {fmtCompact(Math.abs(row.freeAfter))}
              </span>
            </div>
          ))}
        </div>

        {collapsible && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-[12px] text-primary hover:underline"
          >
            Show {hiddenCount} more {hiddenCount === 1 ? "date" : "dates"} →
          </button>
        )}
        {collapsible && expanded && ladder.rows.length > 4 && (
          <button
            onClick={() => setExpanded(false)}
            className="mt-2 text-[12px] text-muted-foreground hover:underline"
          >
            Show less
          </button>
        )}

        {ladder.breachDate && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-[12px] text-red-700 dark:text-red-300">
            <span className="font-medium">
              Full assignment exceeds liquid cash by {fmtLong(Math.abs(ladder.endFree))} past{" "}
              {formatDateOnlyUTC(ladder.breachDate)} — would need margin or a roll.
            </span>
          </div>
        )}
    </>
  );

  const header = (
    <div className="flex items-baseline justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        {cardCollapsible && (
          <ChevronDown
            className={cn("w-4 h-4 text-muted-foreground transition-transform", !cardOpen && "-rotate-90")}
          />
        )}
        <h2 className="text-base font-semibold text-foreground">Assignment Ladder</h2>
      </div>
      {detailHref ? (
        <Link
          href={detailHref}
          className="text-[11px] text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Full ladder →
        </Link>
      ) : (
        <span className="text-[11px] text-muted-foreground">
          {cardCollapsible && !cardOpen
            ? `${fmtLong(ladder.totalReserved)} reserved · ${csps.length} put${csps.length !== 1 ? "s" : ""}`
            : "If assigned, in order of expiry"}
        </span>
      )}
    </div>
  );

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        {cardCollapsible ? (
          <button
            type="button"
            onClick={() => setCardOpen((v) => !v)}
            className="w-full text-left mb-1"
            aria-expanded={cardOpen}
          >
            {header}
          </button>
        ) : (
          <div className="mb-1">{header}</div>
        )}
        {(!cardCollapsible || cardOpen) && body}
        {cardCollapsible && !cardOpen && ladder.breachDate && (
          <p className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400">
            ⚠ Full assignment would need margin past {formatDateOnlyUTC(ladder.breachDate)}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
