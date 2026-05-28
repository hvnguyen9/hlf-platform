"use client";

import { useMemo, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  PiggyBank, Landmark, Plus, Pencil, Trash2, Check, TrendingUp, TrendingDown, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddReserveModal } from "@/features/bookkeeping/components/AddReserveModal";
import { useTaxReserve } from "@/features/bookkeeping/hooks/useBookkeeping";
import { computeReserveSummary } from "@/lib/taxReserve";
import type { QuarterStatus } from "@/lib/taxReserve";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { TaxReserveEntry, TaxReserveKind } from "@/types";

interface Props {
  year: number;
  /** Total estimated tax liability for the year (from estimateTax). */
  target: number;
  loading?: boolean;
}

const QUARTER_STYLES: Record<QuarterStatus["status"], { badge: string; label: string }> = {
  paid: { badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", label: "Paid" },
  partial: { badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", label: "Partial" },
  overdue: { badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30", label: "Overdue" },
  due: { badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", label: "Due soon" },
  upcoming: { badge: "bg-muted text-muted-foreground border-border", label: "Upcoming" },
};

export function TaxReserveTracker({ year, target, loading }: Props) {
  const { data: entries = [], isLoading } = useTaxReserve(year);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TaxReserveEntry | undefined>();
  const [defaultKind, setDefaultKind] = useState<TaxReserveKind>("parked");
  const [defaultQuarter, setDefaultQuarter] = useState<number | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const swrKey = `/api/tax-reserve?year=${year}`;
  function refresh() { void mutate(swrKey); }

  const summary = useMemo(
    () => computeReserveSummary({ year, target, entries }),
    [year, target, entries],
  );

  function openAdd(kind: TaxReserveKind, quarter?: number) {
    setEditEntry(undefined);
    setDefaultKind(kind);
    setDefaultQuarter(quarter);
    setModalOpen(true);
  }
  function openEdit(entry: TaxReserveEntry) {
    setEditEntry(entry);
    setModalOpen(true);
  }
  async function handleDelete(entry: TaxReserveEntry) {
    if (!confirm(`Delete this ${formatCurrency(entry.amount)} ${entry.kind === "paid" ? "payment" : "set-aside"}?`)) return;
    setDeletingId(entry.id);
    const res = await fetch(`/api/tax-reserve/${entry.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Entry deleted"); refresh(); }
    else toast.error("Failed to delete");
    setDeletingId(null);
  }

  const busy = loading || isLoading;
  const pct = Math.min(summary.pctOfTarget * 100, 100);
  const aheadBehind = summary.pace >= 0;

  return (
    <div className="space-y-4">
      {/* Headline reserve card */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            Tax Reserve — {year}
          </CardTitle>
          <Button size="sm" onClick={() => openAdd("parked")} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            Log
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {busy ? <Skeleton className="h-28 w-full" /> : target <= 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No estimated tax yet for {year}. Add income entries and your reserve target will appear here.
            </p>
          ) : (
            <>
              {/* Set aside of target */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Set aside so far</p>
                  <p className="text-3xl font-bold tabular-nums mt-0.5">{formatCurrency(summary.coveredTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    of {formatCurrency(summary.target)} target · {Math.round(summary.pctOfTarget * 100)}%
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                  aheadBehind
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}>
                  {aheadBehind ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {aheadBehind
                    ? `${formatCurrency(Math.abs(summary.pace))} ahead`
                    : `${formatCurrency(Math.abs(summary.pace))} behind`}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", aheadBehind ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  By now you should have set aside about <strong>{formatCurrency(summary.expectedToDate)}</strong> ({summary.quarters.filter((q) => q.isPast).length} of 4 quarterly deadlines passed).
                </p>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">In reserve</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCurrency(summary.parkedTotal)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid to IRS/FTB</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCurrency(summary.paidTotal)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Still to set aside</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{formatCurrency(summary.remainingToTarget)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quarterly schedule */}
      {target > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              Quarterly Estimated Payments
              <Badge variant="outline" className="text-[10px] font-normal">Form 1040-ES</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {summary.quarters.map((q) => {
                const style = QUARTER_STYLES[q.status];
                return (
                  <div
                    key={q.quarter}
                    className={cn(
                      "p-3 rounded-lg border space-y-1.5",
                      q.isCurrent && q.status !== "paid" ? "border-primary/40 bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{q.label}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-medium", style.badge)}>
                        {q.status === "paid" && <Check className="h-2.5 w-2.5 mr-0.5" />}
                        {style.label}
                      </Badge>
                    </div>
                    <p className="text-base font-bold tabular-nums leading-tight">{formatCurrency(q.recommended)}</p>
                    <p className="text-[10px] text-muted-foreground">Due {q.dueDate.replace(/, \d{4}$/, "")}</p>
                    {q.paid > 0 && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Paid {formatCurrency(q.paid)}</p>
                    )}
                    <button
                      onClick={() => openAdd("paid", q.quarter)}
                      className="text-[10px] text-primary hover:underline underline-offset-2"
                    >
                      + Log payment
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-start gap-2 mt-3 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Each quarter is total estimated tax ÷ 4 (federal + CA combined). Underpayment penalties apply if you pay less than 90% of this year&apos;s tax or 100% of last year&apos;s.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Reserve Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {busy ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">No reserve activity logged for {year}.</p>
              <button onClick={() => openAdd("parked")} className="mt-2 text-sm text-primary hover:underline">
                Log your first set-aside →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    e.kind === "paid" ? "bg-emerald-500/10" : "bg-primary/10"
                  )}>
                    {e.kind === "paid"
                      ? <Landmark className="h-4 w-4 text-emerald-500" />
                      : <PiggyBank className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.kind === "paid" ? "Estimated payment" : "Set aside"}</span>
                      {e.kind === "paid" && e.quarter && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Q{e.quarter}</Badge>
                      )}
                    </div>
                    {e.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{e.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(e.amount)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(e.date)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(e)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(e)} disabled={deletingId === e.id} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddReserveModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditEntry(undefined); }}
        year={year}
        entry={editEntry}
        defaultKind={defaultKind}
        defaultQuarter={defaultQuarter}
        onSuccess={refresh}
      />
    </div>
  );
}
