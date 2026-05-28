"use client";

import useSWR from "swr";
import { useMemo } from "react";
import type { StocksListResponse, StockLot } from "@/types";
import { useRouter } from "next/navigation";
import type { QuoteResult } from "@/app/api/quotes/route";

type QuoteMap = Record<string, QuoteResult>;

type Props = {
  portfolioId: string;
  totalCapital?: number;
};

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatCompactCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

const fetcher = async (url: string): Promise<StocksListResponse> => {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as StocksListResponse;
};

const quoteFetcher = (url: string) => fetch(url).then((r) => r.json()) as Promise<QuoteMap>;

export function StocksTable({ portfolioId, totalCapital }: Props) {
  const showAllocation = totalCapital != null && totalCapital > 0;
  const router = useRouter();
  const key = `/api/stocks?portfolioId=${encodeURIComponent(portfolioId)}&status=open`;
  const { data, error, isLoading } = useSWR<StocksListResponse>(key, fetcher);

  const rows: StockLot[] = data?.stockLots ?? [];

  const quoteTickers = useMemo(() => {
    const tickers = [...new Set(rows.map((r) => r.ticker).filter(Boolean))];
    return tickers.length > 0 ? tickers.join(",") : null;
  }, [rows]);

  const { data: quoteData } = useSWR<QuoteMap>(
    quoteTickers ? `/api/quotes?tickers=${quoteTickers}` : null,
    quoteFetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 },
  );
  const quotes: QuoteMap = quoteData ?? {};

  return (
    <div className="overflow-hidden">
      {isLoading ? (
        <div className="px-4 py-4 text-sm text-muted-foreground">Loading stocks…</div>
      ) : error ? (
        <div className="px-4 py-4 text-sm text-destructive">Failed to load stocks.</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          No stock positions yet. Add one to start tracking assigned shares.
        </div>
      ) : (
        <>
          {/* Mobile cards (shown on <md) */}
          <div className="md:hidden space-y-2 p-2">
            {rows.map((r) => {
              const avg = toNumber(r.avgCost);
              const ccPrem = r.ccPremiumCaptured ?? 0;
              const cspPrem = r.cspPremiumDuringHold ?? 0;
              const longPnl = r.longOptionPnlDuringHold ?? 0;
              const originalAvg = r.shares > 0 ? avg + ccPrem / r.shares : avg;
              const effectiveAvg =
                r.shares > 0 ? Math.max(0, avg - (cspPrem + longPnl) / r.shares) : avg;
              const basis = effectiveAvg * r.shares;
              const q = quotes[r.ticker];
              const price = q?.price ?? null;
              const unrealized = price != null ? (price - effectiveAvg) * r.shares : null;
              const unrealizedPct =
                effectiveAvg > 0 && unrealized != null ? (unrealized / basis) * 100 : null;
              const allocPct =
                showAllocation && basis > 0
                  ? (basis / (totalCapital as number)) * 100
                  : null;
              const barColor =
                allocPct == null
                  ? ""
                  : allocPct >= 85
                    ? "bg-red-500"
                    : allocPct >= 60
                      ? "bg-amber-500"
                      : "bg-emerald-500";

              return (
                <button
                  key={r.id}
                  onClick={() =>
                    router.push(`/portfolios/${portfolioId}/stocks/${r.id}`)
                  }
                  className="w-full text-left rounded-xl border bg-card p-3 hover:bg-accent transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold tracking-wide">{r.ticker}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.shares} shares
                      </div>
                    </div>
                    {price != null && (
                      <div className="text-right">
                        <div className="tabular-nums font-medium">
                          {formatCurrency(price)}
                        </div>
                        {q?.changePct != null && (
                          <div
                            className={`text-xs tabular-nums ${
                              q.changePct >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-500 dark:text-red-400"
                            }`}
                          >
                            {q.changePct >= 0 ? "▲" : "▼"}
                            {Math.abs(q.changePct).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Original</div>
                      <div className="tabular-nums font-medium text-muted-foreground">
                        {formatCurrency(originalAvg)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Effective</div>
                      <div className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(effectiveAvg)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Effective Cost Basis</div>
                      <div className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCompactCurrency(basis)}
                      </div>
                    </div>
                    {unrealized != null && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Unrealized
                        </div>
                        <div
                          className={`tabular-nums font-medium ${
                            unrealized >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {unrealized >= 0 ? "+" : ""}
                          {formatCurrency(unrealized)}
                        </div>
                        {unrealizedPct != null && (
                          <div
                            className={`text-xs tabular-nums ${
                              unrealizedPct >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-500 dark:text-red-400"
                            }`}
                          >
                            {unrealizedPct >= 0 ? "+" : ""}
                            {unrealizedPct.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                    {allocPct != null && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Allocation
                        </div>
                        <div className="text-xs tabular-nums font-medium">
                          {allocPct.toFixed(1)}%
                        </div>
                        <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(allocPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop table (shown on md+) */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="min-w-full text-sm text-left text-foreground">
              <thead className="border-b border-border/60">
                <tr>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none">Ticker</th>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none">Shares</th>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none">Original</th>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none">Effective</th>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none">Effective Cost Basis</th>
                  {showAllocation && (
                    <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none text-right">Allocation</th>
                  )}
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none text-right">Live Price</th>
                  <th className="px-2 sm:px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide select-none text-right">Unr. P/L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const avg = toNumber(r.avgCost);
                  const ccPrem = r.ccPremiumCaptured ?? 0;
                  const cspPrem = r.cspPremiumDuringHold ?? 0;
                  const longPnl = r.longOptionPnlDuringHold ?? 0;
                  const originalAvg = r.shares > 0 ? avg + ccPrem / r.shares : avg;
                  const effectiveAvg =
                    r.shares > 0 ? Math.max(0, avg - (cspPrem + longPnl) / r.shares) : avg;
                  const basis = effectiveAvg * r.shares;
                  const q = quotes[r.ticker];
                  const price = q?.price ?? null;
                  const unrealized = price != null ? (price - effectiveAvg) * r.shares : null;
                  const unrealizedPct = effectiveAvg > 0 && unrealized != null ? (unrealized / basis) * 100 : null;

                  return (
                    <tr
                      key={r.id}
                      className="group border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/portfolios/${portfolioId}/stocks/${r.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/portfolios/${portfolioId}/stocks/${r.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-2 sm:px-4 py-2 font-semibold tracking-wide">{r.ticker}</td>
                      <td className="px-2 sm:px-4 py-2">{r.shares}</td>
                      <td className="px-2 sm:px-4 py-2 tabular-nums text-muted-foreground">{formatCurrency(originalAvg)}</td>
                      <td className="px-2 sm:px-4 py-2 tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(effectiveAvg)}</td>
                      <td className="px-2 sm:px-4 py-2 tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(basis)}</td>
                      {showAllocation && (
                        <td className="px-2 sm:px-4 py-2 text-right">
                          {basis > 0 ? (() => {
                            const pct = (basis / (totalCapital as number)) * 100;
                            const barColor = pct >= 85 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
                            return (
                              <div className="space-y-1">
                                <div className="tabular-nums font-medium">{formatCompactCurrency(basis)}</div>
                                <div className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(1)}%</div>
                                <div className="h-1 w-16 ml-auto bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </div>
                            );
                          })() : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 sm:px-4 py-2 text-right">
                        {price != null ? (
                          <div>
                            <div className="tabular-nums font-medium">{formatCurrency(price)}</div>
                            {q?.changePct != null && (
                              <div className={`text-xs tabular-nums ${q.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                {q.changePct >= 0 ? "▲" : "▼"}{Math.abs(q.changePct).toFixed(2)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        {unrealized != null ? (
                          <div>
                            <div className={`tabular-nums font-medium ${unrealized >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              {unrealized >= 0 ? "+" : ""}{formatCurrency(unrealized)}
                            </div>
                            {unrealizedPct != null && (
                              <div className={`text-xs tabular-nums ${unrealizedPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                {unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}