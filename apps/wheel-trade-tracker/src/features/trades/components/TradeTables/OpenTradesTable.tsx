"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { makeOpenColumns } from "./columns-open";
import { Trade } from "@/types";
import { CloseTradeModal } from "@/features/trades/components/CloseTradeModal";
import { mutate } from "swr";
import useSWR from "swr";
import type { QuoteResult } from "@/app/api/quotes/route";

type QuoteMap = Record<string, QuoteResult>;
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { XCircle } from "lucide-react";
import { TypeBadge } from "@/features/trades/components/TypeBadge";
import { useRouter } from "next/navigation";
import { formatDateOnlyUTC } from "@/lib/formatDateOnly";

// ---------- Helpers ----------
const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatCompactUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);

const isCashSecuredPut = (type?: string) => {
  if (!type) return false;
  const t = type.toLowerCase().replaceAll(/\s+/g, "");
  return t === "cashsecuredput" || t === "csp";
};

const isCoveredCall = (type?: string) =>
  !!type && type.toLowerCase().includes("covered") && type.toLowerCase().includes("call");

const isLongOption = (type?: string) => {
  const t = (type ?? "").toLowerCase().replaceAll(/\s+/g, "");
  return t === "put" || t === "call";
};

const isLongCall = (type?: string) => {
  const t = (type ?? "").toLowerCase().replaceAll(/\s+/g, "");
  return t === "call";
};

const isLongPut = (type?: string) => {
  const t = (type ?? "").toLowerCase().replaceAll(/\s+/g, "");
  return t === "put";
};

/**
 * OTM % from strike. Sign convention: positive = OTM, negative = ITM.
 *   CSP  → (price − strike) / price   (price above strike = OTM = safe)
 *   CC   → (strike − price) / price   (strike above price = OTM = safe)
 *   Call → (strike − price) / price   (strike above price = OTM = no intrinsic)
 *   Put  → (price − strike) / price   (price above strike = OTM = no intrinsic)
 */
const calcOtmPct = (type: string | undefined, strike: number, price: number) => {
  if (isCashSecuredPut(type) || isLongPut(type)) return ((price - strike) / price) * 100;
  if (isCoveredCall(type) || isLongCall(type)) return ((strike - price) / price) * 100;
  return null;
};

// For shorts (CSP/CC), OTM is favorable. For longs, ITM is favorable.
const isFavorableMoney = (type: string | undefined, otmPct: number) =>
  isLongOption(type) ? otmPct < 0 : otmPct >= 0;

const calcCapitalInUse = (t: Trade) => {
  const contracts = t.contractsOpen ?? t.contracts ?? 0;
  if (isCashSecuredPut(t.type)) return t.strikePrice * 100 * contracts;
  // CC capital is already tracked on the underlying StockLot — don't double-count.
  if (isCoveredCall(t.type)) return 0;
  if (isLongOption(t.type)) return (t.contractPrice ?? 0) * 100 * contracts;
  return 0;
};

const calcAllocationPct = (t: Trade, totalCapital: number) => {
  if (totalCapital <= 0) return null;
  const capital = calcCapitalInUse(t);
  if (capital <= 0) return null;
  return (capital / totalCapital) * 100;
};

const calcOpenPremium = (t: Trade) => {
  // Only relevant for short options: CSP and Covered Calls
  if (isCashSecuredPut(t.type) || isCoveredCall(t.type)) {
    return (t.contractPrice ?? 0) * 100 * (t.contractsOpen ?? t.contracts ?? 0);
  }
  return undefined; // Not applicable for long Puts/Calls
};

const calcBreakeven = (t: Trade) => {
  const premiumPerShare = t.contractPrice ?? 0;
  if (isCashSecuredPut(t.type)) {
    return t.strikePrice - premiumPerShare;
  }
  if (t.type?.toLowerCase().includes("covered")) {
    return t.entryPrice != null ? t.entryPrice - premiumPerShare : undefined;
  }
  return undefined;
};

const makeBreakevenColumn = (): ColumnDef<Trade> => ({
  id: "breakeven",
  header: "Breakeven",
  enableSorting: true,
  accessorFn: (row) => calcBreakeven(row) ?? Number.POSITIVE_INFINITY,
  cell: ({ row }) => {
    const be = calcBreakeven(row.original);
    if (typeof be !== "number" || !isFinite(be))
      return <span className="text-muted-foreground">—</span>;
    return <span className="tabular-nums">{formatUSD(be)}</span>;
  },
  meta: { align: "right" },
});

const makeOpenPremiumColumn = (): ColumnDef<Trade> => ({
  id: "openPremium",
  header: "Open Premium",
  enableSorting: true,
  accessorFn: (row) => calcOpenPremium(row) ?? -1,
  cell: ({ row }) => {
    const v = calcOpenPremium(row.original);
    if (typeof v !== "number") return <span className="text-muted-foreground">—</span>;
    return (
      <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
        {formatUSD(v)}
      </span>
    );
  },
  meta: { align: "right" },
});

const allocationBarColor = (pct: number) =>
  pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";

const makeAllocationColumn = (totalCapital: number): ColumnDef<Trade> => ({
  id: "allocation",
  header: "Allocation",
  enableSorting: true,
  accessorFn: (row) => calcAllocationPct(row, totalCapital) ?? -1,
  cell: ({ row }) => {
    const pct = calcAllocationPct(row.original, totalCapital);
    if (pct == null) return <span className="text-muted-foreground">—</span>;
    const capital = calcCapitalInUse(row.original);
    return (
      <div className="text-right space-y-1">
        <div className="tabular-nums font-medium">{formatCompactUSD(capital)}</div>
        <div className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(1)}%</div>
        <div className="h-1 w-16 ml-auto bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${allocationBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    );
  },
  meta: { align: "right" },
});

const makePriceColumn = (quotes: QuoteMap, isLoading: boolean): ColumnDef<Trade> => ({
  id: "livePrice",
  header: "Price",
  enableSorting: true,
  accessorFn: (row) => quotes[row.ticker]?.price ?? -1,
  cell: ({ row }) => {
    const q = quotes[row.original.ticker];
    if (isLoading && !q) return <span className="text-muted-foreground text-xs">—</span>;
    if (!q?.price) return <span className="text-muted-foreground text-xs">n/a</span>;
    return (
      <div>
        <div className="tabular-nums font-medium">{formatUSD(q.price)}</div>
        {q.changePct != null && (
          <div className={`text-xs tabular-nums ${q.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
            {q.changePct >= 0 ? "▲" : "▼"}{Math.abs(q.changePct).toFixed(2)}%
          </div>
        )}
      </div>
    );
  },
  meta: { align: "right" },
});

const makeOtmColumn = (quotes: QuoteMap): ColumnDef<Trade> => ({
  id: "otmPct",
  header: "OTM %",
  enableSorting: true,
  accessorFn: (row) => {
    const price = quotes[row.ticker]?.price ?? null;
    if (!price) return -999;
    return calcOtmPct(row.type, row.strikePrice, price) ?? -999;
  },
  cell: ({ row }) => {
    const t = row.original;
    const price = quotes[t.ticker]?.price ?? null;
    if (!price) return <span className="text-muted-foreground">—</span>;
    const otmPct = calcOtmPct(t.type, t.strikePrice, price);
    if (otmPct == null) return <span className="text-muted-foreground">—</span>;
    const isITM = otmPct < 0;
    const favorable = isFavorableMoney(t.type, otmPct);
    return (
      <span className={`text-xs font-semibold tabular-nums ${favorable ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
        {isITM ? "ITM " : ""}{Math.abs(otmPct).toFixed(1)}%{!isITM ? " OTM" : ""}
      </span>
    );
  },
  meta: { align: "right" },
});

// ---------- Component ----------
export function OpenTradesTable({
  trades,
  portfolioId,
  totalCapital,
}: {
  trades: Trade[];
  portfolioId: string;
  totalCapital?: number;
}) {
  const router = useRouter();
  // Default sort: soonest expiration first
  const [sorting, setSorting] = useState<SortingState>([
    { id: "expirationDate", desc: false },
  ]);
  const [selectedTrade, setSelectedTrade] = useState<{
    id: string;
    strikePrice: number;
    contracts: number;
  } | null>(null);

  // Live quotes
  const quoteTickers = useMemo(() => {
    const tickers = [...new Set(trades.map((t) => t.ticker).filter(Boolean))];
    return tickers.length > 0 ? tickers.join(",") : null;
  }, [trades]);
  const { data: quoteData, isLoading: quotesLoading } = useSWR<QuoteMap>(
    quoteTickers ? `/api/quotes?tickers=${quoteTickers}` : null,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );
  const quotes: QuoteMap = quoteData ?? {};

  const columns = useMemo(() => {
    const base = makeOpenColumns() as ColumnDef<Trade, unknown>[];
    // Surface Breakeven right after Strike — it's the key price the tooltip used to hide.
    const strikeIdx = base.findIndex(
      (c) => "accessorKey" in c && c.accessorKey === "strikePrice",
    );
    const insertAt = strikeIdx >= 0 ? strikeIdx + 1 : base.length;
    base.splice(insertAt, 0, makeBreakevenColumn() as ColumnDef<Trade, unknown>);
    const cols: ColumnDef<Trade, unknown>[] = [...base];
    if (totalCapital != null && totalCapital > 0) {
      cols.push(makeAllocationColumn(totalCapital));
    }
    cols.push(makeOpenPremiumColumn());
    cols.push(makePriceColumn(quotes, quotesLoading));
    cols.push(makeOtmColumn(quotes));
    return cols;
  }, [totalCapital, quotes, quotesLoading]);

  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting },
    initialState: {
      sorting: [{ id: "expirationDate", desc: false }],
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allRows = table.getRowModel().rows;

  return (
    <div className="w-full overflow-x-auto">
      {/* Mobile cards (shown on <md) */}
      <div className="md:hidden space-y-2">
        {allRows.length === 0 ? (
          <div className="rounded border p-3 text-center text-sm text-muted-foreground">
            No trades currently open.
          </div>
        ) : (
          allRows.map((row) => {
            const t = row.original as Trade;
            return (
              <button
                key={t.id}
                onClick={() =>
                  router.push(`/portfolios/${portfolioId}/trades/${t.id}`)
                }
                className="w-full text-left rounded-xl border p-3 bg-card hover:bg-accent transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.ticker}</div>
                  <TypeBadge type={t.type} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Strike</span> $
                    {t.strikePrice.toFixed(2)}
                  </div>
                  {(() => {
                    const be = calcBreakeven(t);
                    if (typeof be !== "number" || !isFinite(be)) return null;
                    return (
                      <div>
                        <span className="text-muted-foreground">Breakeven</span>{" "}
                        {formatUSD(be)}
                      </div>
                    );
                  })()}
                  <div>
                    <span className="text-muted-foreground">Exp</span>{" "}
                    {formatDateOnlyUTC(new Date(t.expirationDate))}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Premium</span>{" "}
                    {isCashSecuredPut(t.type) || isCoveredCall(t.type)
                      ? formatUSD(
                          (t.contractPrice ?? 0) *
                            100 *
                            (t.contractsOpen ?? t.contracts ?? 0),
                        )
                      : "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contracts</span>{" "}
                    {t.contractsOpen ?? t.contracts ?? 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">DTE</span>{" "}
                    {(() => {
                      const exp = new Date(t.expirationDate);
                      const now = new Date();
                      const dte = Math.max(0, Math.ceil((Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86_400_000));
                      return <span className={dte <= 7 ? "text-rose-600 font-semibold" : dte <= 21 ? "text-amber-600" : ""}>{dte}d</span>;
                    })()}
                  </div>
                  {totalCapital != null && totalCapital > 0 && (() => {
                    const pct = calcAllocationPct(t, totalCapital);
                    if (pct == null) return null;
                    const capital = calcCapitalInUse(t);
                    return (
                      <div>
                        <div className="text-xs text-muted-foreground">Allocation</div>
                        <div className="tabular-nums font-medium">{formatCompactUSD(capital)}</div>
                        <div className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(1)}%</div>
                        <div className="mt-1 h-1 w-20 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${allocationBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    const q = quotes[t.ticker];
                    if (!q?.price) return null;
                    const otmPct = calcOtmPct(t.type, t.strikePrice, q.price);
                    const isITM = otmPct != null && otmPct < 0;
                    const favorable = otmPct != null && isFavorableMoney(t.type, otmPct);
                    return (
                      <>
                        <div>
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="tabular-nums font-medium">{formatUSD(q.price)}</div>
                          {q.changePct != null && (
                            <div className={`text-xs tabular-nums ${q.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                              {q.changePct >= 0 ? "▲" : "▼"}{Math.abs(q.changePct).toFixed(2)}%
                            </div>
                          )}
                        </div>
                        {otmPct != null && (
                          <div>
                            <div className="text-xs text-muted-foreground">OTM %</div>
                            <div className={`text-xs font-semibold tabular-nums ${favorable ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              {isITM ? "ITM " : ""}{Math.abs(otmPct).toFixed(1)}%{!isITM ? " OTM" : ""}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </button>
            );
          })
        )}
      </div>
      {/* Desktop table (shown on md+) */}
      <div className="hidden md:block">
        <TooltipProvider delayDuration={150}>
          <table className="min-w-full text-sm text-left text-foreground">
            <thead className="border-b border-border/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={
                        header.column.getCanSort()
                          ? "px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none"
                          : "px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none"
                      }
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-[10px] text-muted-foreground">
                            {header.column.getIsSorted() === "asc" && "▲"}
                            {header.column.getIsSorted() === "desc" && "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {allRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No trades currently open.
                  </td>
                </tr>
              ) : (
                allRows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(
                        `/portfolios/${portfolioId}/trades/${row.original.id}`,
                      )
                    }
                  >
                    {row.getVisibleCells().map((cell, idx) => {
                      const isLast = idx === row.getVisibleCells().length - 1;
                      return (
                        <td
                          key={cell.id}
                          className={
                            isLast ? "relative px-4 py-2 pr-10" : "px-4 py-2"
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                          {isLast && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const t = row.original;
                                      setSelectedTrade({
                                        id: t.id,
                                        strikePrice: t.strikePrice,
                                        contracts:
                                          t.contractsOpen ?? t.contracts ?? 0,
                                      });
                                    }}
                                    className="text-gray-400 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400"
                                    aria-label="Close position"
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  align="center"
                                  sideOffset={8}
                                >
                                  Close position
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
      {selectedTrade && (
        <CloseTradeModal
          id={selectedTrade.id}
          portfolioId={portfolioId}
          strikePrice={selectedTrade.strikePrice}
          contracts={selectedTrade.contracts}
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
          refresh={() => {
            mutate(`/api/trades?portfolioId=${portfolioId}&status=open`);
            mutate(`/api/trades?portfolioId=${portfolioId}&status=closed`);
          }}
        />
      )}
    </div>
  );
}
