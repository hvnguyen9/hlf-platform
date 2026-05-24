"use client";

import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle,
  Search, Filter, Copy, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddEntryModal } from "@/features/bookkeeping/components/AddEntryModal";
import { useBookkeeping } from "@/features/bookkeeping/hooks/useBookkeeping";
import { formatCurrency, formatDate, entryAmount } from "@/lib/utils";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/types";
import type { BookkeepingEntry } from "@/types";

interface Props {
  /** When provided, filters entries to this tax year. */
  year?: number;
}

export function TransactionsContent({ year }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BookkeepingEntry | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const from = year ? `${year}-01-01` : undefined;
  const to = year ? `${year}-12-31` : undefined;
  const { data: entries = [], isLoading } = useBookkeeping(from, to);
  const swrKey = `/api/bookkeeping?${from ? `from=${from}&to=${to}` : ""}`;
  function handleSuccess() { void mutate(swrKey); }

  function openCopy(entry: BookkeepingEntry) {
    setEditEntry({
      ...entry,
      id: "",           // empty id signals "new" to the modal
      date: new Date().toISOString().slice(0, 10),
    });
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

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const filtered = entries
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .filter((e) => categoryFilter === "all" || e.category === categoryFilter)
    .filter((e) => {
      if (search === "") return true;
      const q = search.toLowerCase();
      return (
        (e.name ?? "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIncome = filtered.filter((e) => e.type === "income").reduce((s, e) => s + entryAmount(e), 0);
  const totalExpenses = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + entryAmount(e), 0);

  return (
    <div className={year ? "space-y-4" : "p-4 md:p-6 space-y-5 max-w-5xl mx-auto"}>
      {/* Header — only shown standalone */}
      {!year && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All income and expense entries</p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button size="sm" onClick={() => { setEditEntry(undefined); setModalOpen(true); }} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar when embedded inside Records */}
      {year && (
        <div className="hidden md:flex justify-end gap-2">
          <Button size="sm" onClick={() => { setEditEntry(undefined); setModalOpen(true); }} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, category, notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">{filtered.length} entries</span>
          <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalIncome)}</span>
          <span className="text-red-600 dark:text-red-400">-{formatCurrency(totalExpenses)}</span>
          <span className={`font-medium ${totalIncome - totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            Net: {formatCurrency(totalIncome - totalExpenses)}
          </span>
        </div>
      )}

      {/* Entries list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No entries found</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5"
                onClick={() => { setEditEntry(undefined); setModalOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Add Entry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group">
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${entry.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {entry.type === "income"
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* Info — name primary, category + badges secondary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {entry.name ?? entry.category}
                      </span>
                      {entry.name && (
                        <span className="text-xs text-muted-foreground">· {entry.category}</span>
                      )}
                      {entry.recurring && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-primary/40 text-primary flex-shrink-0">
                          <RefreshCw className="h-2.5 w-2.5" /> recurring
                        </Badge>
                      )}
                      {entry.source === "trading" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">auto</Badge>
                      )}
                    </div>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.description}</p>
                    )}
                  </div>

                  {/* Amount + date */}
                  <div className="text-right flex-shrink-0 w-28">
                    {entry.recurring ? (
                      <>
                        <p className={`text-sm font-semibold tabular-nums ${entry.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {entry.type === "income" ? "+" : "-"}{formatCurrency(entryAmount(entry))}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                          {formatCurrency(entry.amount)}/mo
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-sm font-semibold tabular-nums ${entry.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(entry.date)}</p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 w-24">
                    <button
                      onClick={() => openCopy(entry)}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                      title="Copy entry"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditEntry(entry); setModalOpen(true); }}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry)}
                      disabled={deletingId === entry.id}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddEntryModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditEntry(undefined); }}
        entry={editEntry}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
