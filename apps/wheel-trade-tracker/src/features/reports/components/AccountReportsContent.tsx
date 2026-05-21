"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  format,
  startOfDay,
  endOfDay,
  isAfter,
  addDays,
  startOfMonth,
  startOfYear,
} from "date-fns";
import type { Trade } from "@/types";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypeBadge } from "@/features/trades/components/TypeBadge";
import { cn } from "@/lib/utils";
import { ReportCharts } from "./ReportCharts";
import { MultiSelect } from "./MultiSelect";

type PortfolioBasic = { id: string; name: string };
const fetchPortfolios = async (): Promise<PortfolioBasic[]> => {
  const res = await fetch("/api/portfolios", { credentials: "include" });
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : [];
  return rows.map((p: { id: string; name?: string }) => ({ id: p.id, name: p.name ?? p.id }));
};

type ReportRow = Trade & {
  portfolioName: string;
  premiumReceived: number;
  premiumPaidToClose: number;
  premiumCapturedComputed: number;
  pctPLOnPremium: number;
  holdingDays: number;
  contractsClosed: number;
  sharesClosed: number;
  totalPL: number;
  investedCapital: number;
  pctPLOnTotal: number;
  stockExitPrice?: number;
  realizedPnl?: number | null;
  closeReason?: string;
};

type ReportsApiResponse = {
  range: { start: string; end: string };
  count: number;
  rows: ReportRow[];
};

const fetcher = async (url: string): Promise<ReportsApiResponse> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json() as Promise<ReportsApiResponse>;
};

function calcTotalPL(r: ReportRow): number {
  return typeof r.totalPL === "number" && Number.isFinite(r.totalPL)
    ? r.totalPL
    : typeof r.premiumCaptured === "number" ? r.premiumCaptured : 0;
}

function calcPctReturn(r: ReportRow): number {
  if (typeof r.pctPLOnTotal === "number" && Number.isFinite(r.pctPLOnTotal)) return r.pctPLOnTotal;
  if (typeof r.percentPL === "number" && Number.isFinite(r.percentPL)) {
    const v = r.percentPL;
    return Math.abs(v) > 1 ? v / 100 : v;
  }
  return 0;
}

function fmtDateCompact(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d");
}

function fmtUSD(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtUSDExact(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// ── Date presets ────────────────────────────────────────────────────────
// User's workflow:
//   1D  = today
//   1W  = last 7 days
//   1M  = month-to-date
//   1Y  = year-to-date
//   ALL = all history
type DatePreset = "1D" | "1W" | "1M" | "1Y" | "ALL";
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "1Y", label: "1Y" },
  { key: "ALL", label: "All" },
];
// Effectively "all history" for the wheel-tracker (predates any real trades).
const ALL_PRESET_FROM = new Date(2015, 0, 1);

function rangeForPreset(preset: DatePreset): { from: Date; to: Date } {
  const now = endOfDay(new Date());
  switch (preset) {
    case "1D":
      return { from: startOfDay(new Date()), to: now };
    case "1W":
      return { from: startOfDay(addDays(now, -6)), to: now };
    case "1M":
      return { from: startOfMonth(now), to: now };
    case "1Y":
      return { from: startOfYear(now), to: now };
    case "ALL":
      return { from: ALL_PRESET_FROM, to: now };
  }
}

function detectActivePreset(start: Date, end: Date): DatePreset | null {
  for (const { key } of DATE_PRESETS) {
    const r = rangeForPreset(key);
    // 60s tolerance — the "to" recomputes to endOfDay every render.
    if (
      Math.abs(r.from.getTime() - start.getTime()) < 60_000 &&
      Math.abs(r.to.getTime() - end.getTime()) < 60_000
    ) {
      return key;
    }
  }
  return null;
}

const CLOSE_REASON_LABELS: Record<string, string> = {
  expiredWorthless: "Expired",
  assigned: "Assigned",
  manual: "Manual",
};

function CloseReasonBadge({ reason }: { reason?: string }) {
  if (!reason) return <span className="text-muted-foreground">—</span>;
  const label = CLOSE_REASON_LABELS[reason] ?? reason;
  const cls =
    reason === "expiredWorthless"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : reason === "assigned"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function PLCell({ value, pct }: { value: number; pct: number }) {
  const pos = value >= 0;
  return (
    <div>
      <span className={`font-semibold tabular-nums ${pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
        {pos ? "+" : ""}{fmtUSD(value)}
      </span>
      <div className={`text-[11px] tabular-nums ${pos ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-red-400/70"}`}>
        {(pct * 100).toFixed(1)}%
      </div>
    </div>
  );
}

// Aggregate the headline metrics so we can compute the same set for the prior
// period and diff them.
function rollUp(rows: ReportRow[]) {
  const totalPL = rows.reduce((s, r) => s + calcTotalPL(r), 0);
  const wins = rows.filter((r) => calcTotalPL(r) > 0).length;
  const losses = rows.filter((r) => calcTotalPL(r) < 0).length;
  const winRate = rows.length > 0 ? wins / rows.length : null;
  const avgPct = rows.length > 0
    ? rows.reduce((s, r) => s + calcPctReturn(r), 0) / rows.length
    : 0;
  const holdDays = rows
    .map((r) => (typeof r.holdingDays === "number" && r.holdingDays >= 0 ? r.holdingDays : null))
    .filter((d): d is number => d !== null);
  const avgHold = holdDays.length > 0 ? holdDays.reduce((s, d) => s + d, 0) / holdDays.length : null;
  return { totalPL, wins, losses, winRate, avgPct, avgHold, count: rows.length };
}

// Tiny pill rendered under each KPI value when prior-period data is available.
function DeltaBadge({
  value,
  format,
  tone = "auto",
}: {
  value: number | null;
  format: "usd" | "pp" | "days";
  // "auto" = positive is good (green); "muted" = no sign coloring (used for hold time)
  tone?: "auto" | "muted";
}) {
  if (value === null || !Number.isFinite(value) || Math.abs(value) < 0.005) {
    return (
      <div className="text-[10px] text-muted-foreground/60 mt-1">— vs prior</div>
    );
  }
  const pos = value > 0;
  const Arrow = pos ? ArrowUp : ArrowDown;
  const text = (() => {
    if (format === "usd") return `${pos ? "+" : ""}${fmtUSD(value)}`;
    if (format === "pp") return `${pos ? "+" : ""}${value.toFixed(1)}pp`;
    return `${pos ? "+" : ""}${value.toFixed(1)}d`;
  })();
  const colorCls =
    tone === "muted"
      ? "text-muted-foreground"
      : pos
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-500 dark:text-red-400";
  return (
    <div className={`text-[10px] mt-1 flex items-center gap-0.5 tabular-nums ${colorCls}`}>
      <Arrow className="h-2.5 w-2.5" />
      {text}
      <span className="text-muted-foreground/70 ml-0.5">vs prior</span>
    </div>
  );
}

// ── Stats summary ───────────────────────────────────────────────────────
function Stats({ rows, priorRows }: { rows: ReportRow[]; priorRows: ReportRow[] | null }) {
  const cur = rollUp(rows);
  const prior = priorRows ? rollUp(priorRows) : null;
  const hasPrior = prior !== null && prior.count > 0;

  const totalPL = cur.totalPL;
  const winRate = cur.winRate;
  const avgPct = cur.avgPct;
  const avgHold = cur.avgHold;

  // Period-over-period deltas
  const dPL = hasPrior ? totalPL - prior.totalPL : null;
  const dWinRate =
    hasPrior && winRate !== null && prior.winRate !== null
      ? (winRate - prior.winRate) * 100 // percentage points
      : null;
  const dAvgPct =
    hasPrior ? (avgPct - prior.avgPct) * 100 : null; // percentage points
  const dAvgHold =
    hasPrior && avgHold !== null && prior.avgHold !== null
      ? avgHold - prior.avgHold
      : null;

  const plValues = rows.map((r) => calcTotalPL(r));
  const best = plValues.length > 0 ? Math.max(...plValues) : null;
  const worst = plValues.length > 0 ? Math.min(...plValues) : null;

  const reasonCounts = rows.reduce<Record<string, { count: number; pl: number }>>((acc, r) => {
    const reason = r.closeReason ?? "manual";
    if (!acc[reason]) acc[reason] = { count: 0, pl: 0 };
    acc[reason].count += 1;
    acc[reason].pl += calcTotalPL(r);
    return acc;
  }, {});

  const plPos = totalPL >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total P/L */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total P/L</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${plPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {plPos ? "+" : ""}{fmtUSD(totalPL)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{rows.length} trade{rows.length !== 1 ? "s" : ""}</p>
          {hasPrior && <DeltaBadge value={dPL} format="usd" />}
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Win Rate</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${winRate != null && winRate > 0 ? "text-emerald-600 dark:text-emerald-400" : winRate != null ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
            {winRate != null ? `${(winRate * 100).toFixed(0)}%` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {cur.wins}W · {cur.losses}L
          </p>
          {hasPrior && <DeltaBadge value={dWinRate} format="pp" />}
        </div>

        {/* Avg Return */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Avg Return</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${avgPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {avgPct >= 0 ? "+" : ""}{(avgPct * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">per position</p>
          {hasPrior && <DeltaBadge value={dAvgPct} format="pp" />}
        </div>

        {/* Avg Hold */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Avg Hold</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
            {avgHold != null ? `${avgHold.toFixed(1)}d` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">days in trade</p>
          {hasPrior && <DeltaBadge value={dAvgHold} format="days" tone="muted" />}
        </div>
      </div>

      {/* Secondary row */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-1 text-xs text-muted-foreground">
        {best != null && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Best <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmtUSDExact(best)}</span>
          </span>
        )}
        {worst != null && (
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-red-400" />
            Worst <span className={`font-medium ${worst < 0 ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>{fmtUSDExact(worst)}</span>
          </span>
        )}
        {Object.entries(reasonCounts).map(([reason, { count, pl }]) => (
          <span key={reason}>
            {CLOSE_REASON_LABELS[reason] ?? reason}{" "}
            <span className="font-medium text-foreground">{count}</span>
            <span className="mx-0.5 opacity-40">·</span>
            <span className={pl >= 0 ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-red-500"}>
              {pl >= 0 ? "+" : ""}{fmtUSD(pl)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main table ──────────────────────────────────────────────────────────
function ReportTable({
  rows,
  csvHref,
  showPortfolio,
  selectedTickers,
  setSelectedTickers,
  tickers,
  selectedTypes,
  setSelectedTypes,
  types,
  selectedCloseReasons,
  setSelectedCloseReasons,
}: {
  rows: ReportRow[];
  csvHref: string;
  showPortfolio: boolean;
  selectedTickers: string[];
  setSelectedTickers: (t: string[]) => void;
  tickers: string[];
  selectedTypes: string[];
  setSelectedTypes: (t: string[]) => void;
  types: string[];
  selectedCloseReasons: string[];
  setSelectedCloseReasons: (r: string[]) => void;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.closedAt ?? b.createdAt).getTime() - new Date(a.closedAt ?? a.createdAt).getTime()),
    [rows],
  );

  return (
    <div className="space-y-3">
      {/* Filter + Export row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelect
            placeholder="All types"
            options={types.map((t) => ({ value: t, label: t }))}
            selected={selectedTypes}
            onChange={setSelectedTypes}
            disabled={types.length === 0}
            triggerClassName="w-full sm:w-[150px]"
          />
          <MultiSelect
            placeholder="All tickers"
            options={tickers.map((t) => ({ value: t, label: t }))}
            selected={selectedTickers}
            onChange={setSelectedTickers}
            disabled={tickers.length === 0}
            triggerClassName="w-full sm:w-[140px]"
          />
          <MultiSelect
            placeholder="All reasons"
            options={Object.entries(CLOSE_REASON_LABELS).map(([value, label]) => ({ value, label }))}
            selected={selectedCloseReasons}
            onChange={setSelectedCloseReasons}
            triggerClassName="w-full sm:w-[140px]"
          />
        </div>
        <a href={csvHref}>
          <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </a>
      </div>

      {/* Mobile cards (shown on <md) */}
      <div className="md:hidden space-y-2">
        {sorted.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No closed trades in this range.
          </div>
        ) : (
          sorted.map((r) => {
            const pl = calcTotalPL(r);
            const pct = calcPctReturn(r);
            const isStock = r.type === "STOCK_LOT";
            const pos = pl >= 0;
            return (
              <div
                key={r.id}
                className="rounded-xl border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.ticker}</span>
                      <TypeBadge type={r.type ?? ""} />
                      <CloseReasonBadge reason={r.closeReason} />
                    </div>
                    {showPortfolio && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {r.portfolioName}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-semibold tabular-nums ${pos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {pos ? "+" : ""}{fmtUSD(pl)}
                    </div>
                    <div className={`text-xs tabular-nums ${pos ? "text-emerald-600/70 dark:text-emerald-400/70" : "text-red-400/70"}`}>
                      {(pct * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <div className="text-muted-foreground">Closed</div>
                    <div className="text-foreground">{fmtDateCompact(r.closedAt ?? undefined)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{isStock ? "Entry" : "Strike"}</div>
                    <div className="tabular-nums text-foreground">
                      {isStock
                        ? (r.entryPrice != null ? `$${Number(r.entryPrice).toFixed(2)}` : "—")
                        : (r.strikePrice ? `$${Number(r.strikePrice).toFixed(0)}` : "—")}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Qty</div>
                    <div className="tabular-nums text-foreground">
                      {isStock
                        ? `${r.sharesClosed ?? 0} sh`
                        : `${r.contractsClosed ?? r.contractsInitial ?? 0}x`}
                    </div>
                  </div>
                  {!isStock && (
                    <div>
                      <div className="text-muted-foreground">Expiry</div>
                      <div className="text-foreground">{fmtDateCompact(typeof r.expirationDate === "string" ? r.expirationDate : undefined)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted-foreground">Held</div>
                    <div className="tabular-nums text-foreground">{r.holdingDays > 0 ? `${r.holdingDays}d` : "—"}</div>
                  </div>
                </div>
                {r.notes && (
                  <div className="mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground line-clamp-2">
                    {r.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table (shown on md+) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-border bg-muted/50">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-[11px] [&>th]:font-semibold [&>th]:text-muted-foreground [&>th]:uppercase [&>th]:tracking-wide [&>th]:whitespace-nowrap">
              <th>Date Closed</th>
              {showPortfolio && <th>Portfolio</th>}
              <th>Ticker</th>
              <th>Type</th>
              <th>Strike / Entry</th>
              <th>Expiry</th>
              <th>Qty</th>
              <th>P/L</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={showPortfolio ? 11 : 10} className="text-center text-muted-foreground py-10 px-3">
                  No closed trades in this range.
                </td>
              </tr>
            ) : (
              sorted.map((r) => {
                const pl = calcTotalPL(r);
                const pct = calcPctReturn(r);
                const isStock = r.type === "STOCK_LOT";
                return (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors [&>td]:px-3 [&>td]:py-3">
                    <td className="whitespace-nowrap text-muted-foreground text-xs">{fmtDateCompact(r.closedAt ?? undefined)}</td>
                    {showPortfolio && (
                      <td className="whitespace-nowrap">
                        <span className="text-xs font-medium text-foreground">{r.portfolioName}</span>
                      </td>
                    )}
                    <td className="whitespace-nowrap font-semibold text-foreground">{r.ticker}</td>
                    <td><TypeBadge type={r.type ?? ""} /></td>
                    <td className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {isStock
                        ? (r.entryPrice != null ? `$${Number(r.entryPrice).toFixed(2)}` : "—")
                        : (r.strikePrice ? `$${Number(r.strikePrice).toFixed(0)}` : "—")}
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                      {isStock ? "—" : fmtDateCompact(typeof r.expirationDate === "string" ? r.expirationDate : undefined)}
                    </td>
                    <td className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {isStock
                        ? `${r.sharesClosed ?? 0} sh`
                        : `${r.contractsClosed ?? r.contractsInitial ?? 0}x`}
                    </td>
                    <td className="whitespace-nowrap"><PLCell value={pl} pct={pct} /></td>
                    <td className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {r.holdingDays > 0 ? `${r.holdingDays}d` : "—"}
                    </td>
                    <td><CloseReasonBadge reason={r.closeReason} /></td>
                    <td className="max-w-[180px]">
                      {r.notes ? (
                        <span className="block truncate text-xs text-muted-foreground" title={r.notes}>{r.notes}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Date filter bar ─────────────────────────────────────────────────────
function DateFilterBar({
  start,
  end,
  onApply,
  mounted,
  selectedPortfolioId,
  setSelectedPortfolioId,
  portfolios,
  portfoliosLoading,
  portfoliosError,
  embedded,
}: {
  start: Date;
  end: Date;
  onApply: (range: { from: Date; to: Date }) => void;
  mounted: boolean;
  selectedPortfolioId: string;
  setSelectedPortfolioId: (id: string) => void;
  portfolios?: PortfolioBasic[];
  portfoliosLoading: boolean;
  portfoliosError?: unknown;
  embedded?: boolean;
}) {
  const [fromLocal, setFromLocal] = useState<Date>(start);
  const [toLocal, setToLocal] = useState<Date>(end);
  const [customExpanded, setCustomExpanded] = useState(false);

  useEffect(() => { setFromLocal(start); setToLocal(end); }, [start, end]);

  const detected = mounted ? detectActivePreset(start, end) : null;
  // Custom mode is active when no preset matches, or when the user explicitly
  // expanded it to fine-tune the dates.
  const isCustom = customExpanded || detected === null;

  function applyPreset(key: DatePreset) {
    setCustomExpanded(false);
    onApply(rangeForPreset(key));
  }

  const segItemCls = (active: boolean) =>
    cn(
      "h-7 px-2.5 text-[11px] font-medium rounded-sm transition-colors",
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Segmented timeframe control */}
      <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
        {DATE_PRESETS.map(({ key, label }) => {
          const active = !customExpanded && detected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={segItemCls(active)}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomExpanded(true)}
          className={segItemCls(isCustom)}
        >
          {isCustom && mounted
            ? `${format(start, "MMM d")} – ${format(end, "MMM d")}`
            : "Custom"}
        </button>
      </div>

      {/* Custom date range — From / To / Apply, only when Custom is active */}
      {isCustom && (
      <div className="flex flex-wrap items-center gap-2">
        {/* From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-normal">
              <CalendarIcon className="h-3.5 w-3.5" />
              {mounted ? format(fromLocal, "MMM d, yyyy") : "—"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromLocal} onSelect={(d) => d && setFromLocal(startOfDay(d))} disabled={{ after: new Date() }} initialFocus />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-xs">→</span>

        {/* To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-normal">
              <CalendarIcon className="h-3.5 w-3.5" />
              {mounted ? format(toLocal, "MMM d, yyyy") : "—"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={toLocal} onSelect={(d) => d && setToLocal(endOfDay(d))} disabled={{ after: new Date() }} initialFocus />
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (fromLocal && toLocal && !isAfter(startOfDay(fromLocal), endOfDay(toLocal))) {
              onApply({ from: startOfDay(fromLocal), to: endOfDay(toLocal) });
            }
          }}
          disabled={!fromLocal || !toLocal || isAfter(startOfDay(fromLocal), endOfDay(toLocal))}
        >
          Apply
        </Button>
      </div>
      )}

      {/* Portfolio filter — hidden when embedded. Pinned to the far right on
          desktop so it stays put when the custom range expands inline. */}
      {!embedded && (
        <Select
          value={selectedPortfolioId}
          onValueChange={setSelectedPortfolioId}
          disabled={portfoliosLoading || !!portfoliosError}
        >
          <SelectTrigger className="h-8 w-full sm:w-[180px] sm:ml-auto text-xs">
            <SelectValue placeholder="All portfolios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All portfolios</SelectItem>
            {(portfolios ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ── Root export ─────────────────────────────────────────────────────────
export function AccountsReportContent({
  defaultPortfolioId,
  embedded,
}: {
  defaultPortfolioId?: string;
  embedded?: boolean;
} = {}) {
  const [start, setStart] = useState<Date>(() => rangeForPreset("1D").from);
  const [end, setEnd] = useState<Date>(() => rangeForPreset("1D").to);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(defaultPortfolioId ?? "all");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCloseReasons, setSelectedCloseReasons] = useState<string[]>([]);

  const { data: portfolios, error: portfoliosError, isLoading: portfoliosLoading } = useSWR("/api/portfolios", fetchPortfolios, { revalidateOnFocus: false });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("start", start.toISOString());
    p.set("end", end.toISOString());
    p.set("format", "json");
    if (selectedPortfolioId) p.set("portfolioId", selectedPortfolioId);
    return p.toString();
  }, [selectedPortfolioId, start, end]);

  const { data, error, isLoading } = useSWR(`/api/reports/closed?${qs}`, fetcher, { revalidateOnFocus: false });

  // Prior period — same length as the current range, shifted back. Skipped
  // when range >= ~3 years (ALL preset) since the comparison stops being meaningful.
  const priorRange = useMemo(() => {
    const rangeMs = end.getTime() - start.getTime();
    const THREE_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 3;
    if (rangeMs <= 0 || rangeMs > THREE_YEARS_MS) return null;
    const priorEnd = new Date(start.getTime() - 1);
    const priorStart = new Date(priorEnd.getTime() - rangeMs);
    return { start: priorStart, end: priorEnd };
  }, [start, end]);

  const priorQs = useMemo(() => {
    if (!priorRange) return null;
    const p = new URLSearchParams();
    p.set("start", priorRange.start.toISOString());
    p.set("end", priorRange.end.toISOString());
    p.set("format", "json");
    if (selectedPortfolioId) p.set("portfolioId", selectedPortfolioId);
    return p.toString();
  }, [priorRange, selectedPortfolioId]);

  const { data: priorData } = useSWR(
    priorQs ? `/api/reports/closed?${priorQs}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const csvUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("start", start.toISOString());
    p.set("end", end.toISOString());
    p.set("format", "csv");
    if (selectedPortfolioId) p.set("portfolioId", selectedPortfolioId);
    return `/api/reports/closed?${p.toString()}`;
  }, [selectedPortfolioId, start, end]);

  const availableTickers = useMemo(() => {
    const uniq = new Set<string>();
    for (const r of data?.rows ?? []) if (r.ticker?.trim()) uniq.add(r.ticker.trim().toUpperCase());
    return Array.from(uniq).sort();
  }, [data?.rows]);

  const availableTypes = useMemo(() => {
    const uniq = new Set<string>();
    for (const r of data?.rows ?? []) if (r.type?.trim()) uniq.add(r.type.trim());
    return Array.from(uniq).sort();
  }, [data?.rows]);

  const applyFilters = (rows: ReportRow[]) =>
    rows.filter((r) => {
      const okTicker = selectedTickers.length === 0 || selectedTickers.includes((r.ticker ?? "").toUpperCase());
      const okType = selectedTypes.length === 0 || selectedTypes.includes(r.type ?? "");
      const okReason = selectedCloseReasons.length === 0 || selectedCloseReasons.includes(r.closeReason ?? "manual");
      return okTicker && okType && okReason;
    });

  const filteredRows = useMemo(
    () => applyFilters(data?.rows ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.rows, selectedTickers, selectedTypes, selectedCloseReasons],
  );

  const filteredPriorRows = useMemo(
    () => (priorData ? applyFilters(priorData.rows ?? []) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorData, selectedTickers, selectedTypes, selectedCloseReasons],
  );

  // Drop stale selections when the available options change (e.g. new date range).
  useEffect(() => {
    if (!data) return;
    const tickerSet = new Set(availableTickers);
    const typeSet = new Set(availableTypes);
    setSelectedTickers((prev) => {
      const next = prev.filter((t) => tickerSet.has(t));
      return next.length === prev.length ? prev : next;
    });
    setSelectedTypes((prev) => {
      const next = prev.filter((t) => typeSet.has(t));
      return next.length === prev.length ? prev : next;
    });
  }, [availableTickers, availableTypes, data]);

  const showPortfolio = selectedPortfolioId === "all";

  return (
    <div className={cn(embedded ? "space-y-5" : "p-4 sm:p-6 space-y-5")}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Closed trades · {mounted ? `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}` : "—"}</p>
        </div>
      )}

      <DateFilterBar
        start={start}
        end={end}
        onApply={({ from, to }) => { setStart(from); setEnd(to); }}
        mounted={mounted}
        selectedPortfolioId={selectedPortfolioId}
        setSelectedPortfolioId={setSelectedPortfolioId}
        portfolios={portfolios}
        portfoliosLoading={portfoliosLoading}
        portfoliosError={portfoliosError}
        embedded={embedded}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-red-500">Failed to load report.</p>}

      {data && (
        <div className="space-y-5">
          <Stats rows={filteredRows} priorRows={filteredPriorRows} />
          <ReportCharts rows={filteredRows} />
          <ReportTable
            rows={filteredRows}
            csvHref={csvUrl}
            showPortfolio={showPortfolio}
            selectedTickers={selectedTickers}
            setSelectedTickers={setSelectedTickers}
            tickers={availableTickers}
            selectedTypes={selectedTypes}
            setSelectedTypes={setSelectedTypes}
            types={availableTypes}
            selectedCloseReasons={selectedCloseReasons}
            setSelectedCloseReasons={setSelectedCloseReasons}
          />
        </div>
      )}
    </div>
  );
}

export default AccountsReportContent;
