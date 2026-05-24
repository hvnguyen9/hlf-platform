"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Plus, Pencil, Trash2, Copy, RefreshCw, TrendingUp, TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddEntryModal } from "@/features/bookkeeping/components/AddEntryModal";
import { useBookkeeping, useTradingSummary } from "@/features/bookkeeping/hooks/useBookkeeping";
import { formatCurrency, formatDate, cn, entryAmount } from "@/lib/utils";
import type { BookkeepingEntry } from "@/types";

// ── Month Notes ──────────────────────────────────────────────────────────────
function MonthNotes({ yearMonth }: { yearMonth: string }) {
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/notes/${yearMonth}`)
      .then((r) => r.json())
      .then((data: { notes: string }) => { setNotes(data.notes); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [yearMonth]);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    await fetch(`/api/notes/${yearMonth}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setSaving(false);
  }, [yearMonth]);

  function handleChange(value: string) {
    setNotes(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void save(value), 1200);
  }

  function handleBlur() {
    if (debounce.current) clearTimeout(debounce.current);
    void save(notes);
  }

  if (!loaded) return null;

  return (
    <div className="px-4 py-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-muted-foreground">Month notes</p>
        {saving && <span className="text-[10px] text-muted-foreground/60">saving…</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes for this month — unusual events, context, reminders…"
        rows={2}
        className="w-full text-sm bg-transparent resize-none border-0 outline-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed"
      />
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function YearSummary({
  entries,
  trading,
  year,
}: {
  entries: BookkeepingEntry[];
  trading: { totalPremium: number; tradeCount: number; byMonth: Record<string, number> } | undefined;
  year: number;
}) {
  const tradingPL = trading?.totalPremium ?? 0;
  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + entryAmount(e), 0);
  const totalExpenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + entryAmount(e), 0);
  const netIncome = tradingPL + totalIncome - totalExpenses;

  const items = [
    { label: "Trading P&L", value: tradingPL, color: tradingPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
    { label: "Other Income", value: totalIncome, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Expenses", value: totalExpenses, color: "text-red-600 dark:text-red-400", negate: true },
    { label: "Net Income", value: netIncome, color: netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", bold: true },
  ];

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{year} Summary</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map(({ label, value, color, negate, bold }) => (
          <div key={label}>
            <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn("tabular-nums", bold ? "text-base font-bold" : "text-sm font-semibold", color)}>
              {negate ? "-" : value >= 0 ? "+" : ""}{formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  year: number;
  /** Expand this month index on initial render (0-indexed). */
  initialMonth?: number;
}

export function RecordsLedger({ year, initialMonth }: Props) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const isCurrentYear = year === currentYear;

  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(
    new Set([initialMonth ?? currentMonthIdx])
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BookkeepingEntry | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data: entries = [], isLoading } = useBookkeeping(from, to);
  const { data: trading } = useTradingSummary(from, to);

  const swrKey = `/api/bookkeeping?from=${from}&to=${to}`;
  function handleSuccess() { void mutate(swrKey); void mutate(`/api/trading-summary?from=${from}&to=${to}`); }

  function openCopy(entry: BookkeepingEntry) {
    setEditEntry({ ...entry, id: "", date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  async function handleDelete(entry: BookkeepingEntry) {
    if (!confirm(`Delete "${entry.name ?? entry.category}" for ${formatCurrency(entry.amount)}?`)) return;
    setDeletingId(entry.id);
    const res = await fetch(`/api/bookkeeping/${entry.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Entry deleted"); void mutate(swrKey); }
    else toast.error("Failed to delete");
    setDeletingId(null);
  }

  function toggleMonth(idx: number) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const byMonth = useMemo(() => {
    const map = new Map<number, BookkeepingEntry[]>();
    for (let i = 0; i < 12; i++) map.set(i, []);
    for (const e of entries) {
      const m = new Date(e.date).getUTCMonth();
      map.get(m)?.push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-2">
      <div className="hidden md:flex justify-end">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setModalOpen(true); }} className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {MONTHS.map((monthName, idx) => {
            const monthEntries = byMonth.get(idx) ?? [];
            const monthKey = `${year}-${String(idx + 1).padStart(2, "0")}`;
            const tradingPL = trading?.byMonth[monthKey] ?? 0;
            const income = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + entryAmount(e), 0);
            const expenses = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + entryAmount(e), 0);
            const net = income + tradingPL - expenses;
            const hasData = monthEntries.length > 0 || tradingPL !== 0;
            const isExpanded = expandedMonths.has(idx);
            const isCurrentMonth = isCurrentYear && idx === currentMonthIdx;
            const isFuture = isCurrentYear && idx > currentMonthIdx;

            return (
              <Card key={monthName} className={cn(
                "overflow-hidden transition-opacity",
                isFuture && !hasData && "opacity-40",
                isCurrentMonth && "ring-1 ring-primary/30"
              )}>
                <button
                  type="button"
                  onClick={() => toggleMonth(idx)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex-shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold text-sm", isCurrentMonth && "text-primary")}>{monthName}</span>
                      {isCurrentMonth && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary">current</Badge>
                      )}
                      {!hasData && <span className="text-xs text-muted-foreground/60">no entries</span>}
                    </div>
                  </div>
                  {hasData && (
                    <div className="flex items-center gap-4 text-sm flex-shrink-0">
                      {tradingPL !== 0 && (
                        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                          {tradingPL >= 0
                            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                            : <TrendingDown className="h-3 w-3 text-red-500" />}
                          <span className={cn("tabular-nums", tradingPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                            {tradingPL >= 0 ? "+" : ""}{formatCurrency(tradingPL)}
                          </span>
                        </div>
                      )}
                      {income > 0 && <span className="hidden sm:block text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatCurrency(income)}</span>}
                      {expenses > 0 && <span className="hidden sm:block text-xs text-red-600 dark:text-red-400 tabular-nums">-{formatCurrency(expenses)}</span>}
                      <span className={cn("font-semibold text-sm tabular-nums", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {net >= 0 ? "+" : ""}{formatCurrency(net)}
                      </span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {tradingPL !== 0 && (
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/20">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", tradingPL >= 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
                          {tradingPL >= 0
                            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">Realized Trading P&L</span>
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4">auto</Badge>
                        </div>
                        <span className={cn("text-sm font-semibold tabular-nums", tradingPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          {tradingPL >= 0 ? "+" : ""}{formatCurrency(tradingPL)}
                        </span>
                      </div>
                    )}

                    {monthEntries.length === 0 && tradingPL === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">No entries for {monthName}</p>
                        <Button size="sm" variant="outline" className="mt-2 gap-1.5"
                          onClick={() => { setEditEntry(undefined); setModalOpen(true); }}>
                          <Plus className="h-3.5 w-3.5" /> Add Entry
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {monthEntries
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((entry) => (
                            <div key={entry.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${entry.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                {entry.type === "income"
                                  ? <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-medium truncate">{entry.name ?? entry.category}</span>
                                  {entry.name && <span className="text-xs text-muted-foreground">· {entry.category}</span>}
                                  {entry.recurring && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 gap-0.5 border-primary/40 text-primary flex-shrink-0">
                                      <RefreshCw className="h-2 w-2" />
                                    </Badge>
                                  )}
                                </div>
                                {entry.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.description}</p>}
                              </div>
                              <div className="text-right flex-shrink-0 w-24">
                                {entry.recurring ? (
                                  <>
                                    <p className={`text-sm font-semibold tabular-nums ${entry.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                      {entry.type === "income" ? "+" : "-"}{formatCurrency(entryAmount(entry))}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground tabular-nums">{formatCurrency(entry.amount)}/mo</p>
                                  </>
                                ) : (
                                  <>
                                    <p className={`text-sm font-semibold tabular-nums ${entry.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                      {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">{formatDate(entry.date)}</p>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 w-20">
                                <button onClick={() => openCopy(entry)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Copy entry">
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button onClick={() => { setEditEntry(entry); setModalOpen(true); }} className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => handleDelete(entry)} disabled={deletingId === entry.id} className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {(monthEntries.length > 0 || tradingPL !== 0) && (
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground">
                        <span>{monthEntries.length} manual {monthEntries.length === 1 ? "entry" : "entries"}</span>
                        <span className={cn("font-semibold", net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                          Net {formatCurrency(net)}
                        </span>
                      </div>
                    )}

                    {/* Month notes — auto-saves on blur / debounce */}
                    <MonthNotes yearMonth={monthKey} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Year summary */}
      {!isLoading && (
        <YearSummary entries={entries} trading={trading} year={year} />
      )}

      <AddEntryModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditEntry(undefined); }}
        entry={editEntry}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
