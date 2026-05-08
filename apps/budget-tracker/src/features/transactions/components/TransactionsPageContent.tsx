"use client";

import { useState } from "react";
import { Plus, Search, Download } from "lucide-react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { TransactionModal } from "./TransactionModal";
import { TransactionRow } from "./TransactionRow";
import { RecurringList } from "@/features/recurring/components/RecurringList";
import { RecurringModal, type RecurringPrefill } from "@/features/recurring/components/RecurringModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getCurrentMonthYear, formatMonthYear } from "@/lib/formatters";
import { exportTransactionsCsv } from "@/lib/exportCsv";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/types";

export function TransactionsPageContent() {
  const { month: nowMonth, year: nowYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  // One-time transaction modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Make-recurring modal
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringPrefill, setRecurringPrefill] = useState<RecurringPrefill | null>(null);
  const [elevatingId, setElevatingId] = useState<string | null>(null);

  const { transactions, isLoading, mutate } = useTransactions({
    year, month,
    type: typeFilter !== "all" ? typeFilter : undefined,
    categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  });
  const { categories } = useCategories();

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === nowMonth && year === nowYear) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(t: Transaction) { setEditing(t); setModalOpen(true); }

  function openMakeRecurring(t: Transaction) {
    setElevatingId(t.id);
    setRecurringPrefill({
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryId,
      description: t.description,
      dayOfMonth: new Date(t.date).getUTCDate(),
    });
    setRecurringModalOpen(true);
  }

  async function handleRecurringSaved() {
    // Delete the original transaction to avoid double-counting this month
    if (elevatingId) {
      await fetch(`/api/transactions/${elevatingId}`, { method: "DELETE" });
      toast.success("Moved to recurring — original transaction removed");
    }
    // Refresh both lists
    mutate();
    globalMutate("/api/recurring");
    setElevatingId(null);
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all your income and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportTransactionsCsv(transactions, `transactions-${year}-${month}.csv`)}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Month nav + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[7rem] text-center">{formatMonthYear(month, year)}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={month === nowMonth && year === nowYear}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recurring items */}
      <RecurringList />

      {/* Summary strip */}
      <div className="flex items-center gap-6 px-4 py-2.5 bg-card rounded-lg border text-sm">
        <span className="text-muted-foreground">{transactions.length} entries</span>
        <span className="text-emerald-600 font-semibold">+{formatCurrency(totalIncome)}</span>
        <span className="text-rose-600 font-semibold">-{formatCurrency(totalExpenses)}</span>
        <span className="font-semibold ml-auto">{formatCurrency(totalIncome - totalExpenses)} net</span>
      </div>

      {/* Transaction list */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No transactions found. Add one to get started!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                onEdit={() => openEdit(t)}
                onDelete={() => mutate()}
                onMakeRecurring={() => openMakeRecurring(t)}
              />
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => mutate()}
        editing={editing}
      />

      <RecurringModal
        open={recurringModalOpen}
        onClose={() => { setRecurringModalOpen(false); setRecurringPrefill(null); setElevatingId(null); }}
        onSaved={handleRecurringSaved}
        prefill={recurringPrefill}
      />
    </div>
  );
}
