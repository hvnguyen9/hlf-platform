"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Repeat2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { useRecurring } from "@/features/recurring/hooks/useRecurring";
import { RecurringModal } from "./RecurringModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RecurringTransaction } from "@/types";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function RecurringList() {
  const { recurring, isLoading, mutate } = useRecurring();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const income = recurring.filter((r) => r.type === "income");
  const expenses = recurring.filter((r) => r.type === "expense");
  const monthlyIncome = income.reduce((s, r) => s + r.amount, 0);
  const monthlyExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  async function toggleActive(r: RecurringTransaction) {
    try {
      await fetch(`/api/recurring/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      mutate();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/recurring/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Recurring item deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function Row({ r }: { r: RecurringTransaction }) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 group hover:bg-muted/40 transition-colors",
        !r.isActive && "opacity-50"
      )}>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.category?.color ?? "#94a3b8" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {r.description || r.category?.name || "Uncategorized"}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.category?.name} · {ordinal(r.dayOfMonth)} of every month
          </p>
        </div>
        <span className={cn(
          "text-sm font-semibold tabular-nums flex-shrink-0",
          r.type === "income" ? "text-emerald-600" : "text-rose-600"
        )}>
          {r.type === "income" ? "+" : "-"}{formatCurrency(r.amount)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
            onClick={() => toggleActive(r)} title={r.isActive ? "Pause" : "Resume"}>
            {r.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => { setEditing(r); setModalOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Recurring Items</h2>
            {!isLoading && recurring.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(monthlyIncome)} in · {formatCurrency(monthlyExpenses)} out /mo
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : recurring.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No recurring items yet. Add rent, salary, subscriptions — anything that repeats monthly.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {income.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground">Income</div>
                {income.map((r) => <Row key={r.id} r={r} />)}
              </>
            )}
            {expenses.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground">Expenses</div>
                {expenses.map((r) => <Row key={r.id} r={r} />)}
              </>
            )}
          </div>
        )}
      </div>

      <RecurringModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => mutate()}
        editing={editing}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.description || deleteTarget?.category?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This recurring item will no longer appear in any month. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
