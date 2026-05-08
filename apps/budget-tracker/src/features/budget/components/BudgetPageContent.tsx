"use client";

import { useState } from "react";
import { Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface BudgetEditTarget {
  id: string;
  name: string;
  color: string;
  currentAmount: number | null;
}

export function BudgetPageContent() {
  const { categories, isLoading, mutate } = useCategories();
  const [editTarget, setEditTarget] = useState<BudgetEditTarget | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");
  const budgetedCategories = expenseCategories.filter((c) => c.monthlyBudget !== null);
  const unbudgetedCategories = expenseCategories.filter((c) => c.monthlyBudget === null);
  const totalMonthly = budgetedCategories.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0);

  function openEdit(c: Category) {
    setEditTarget({ id: c.id, name: c.name, color: c.color, currentAmount: c.monthlyBudget });
    setInputValue(c.monthlyBudget ? String(c.monthlyBudget) : "");
  }

  async function handleSave() {
    if (!editTarget) return;
    const amount = parseFloat(inputValue);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget: amount > 0 ? amount : null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Budget updated");
      mutate();
      setEditTarget(null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget: null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Budget cleared");
      mutate();
      setEditTarget(null);
    } catch {
      toast.error("Failed to clear");
    } finally {
      setSaving(false);
    }
  }

  function CategoryRow({ c }: { c: Category }) {
    const hasbudget = c.monthlyBudget !== null;
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 group transition-colors">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: c.color + "20" }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
        </div>
        <span className="text-sm font-medium text-foreground flex-1">{c.name}</span>
        {hasbudget ? (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(c.monthlyBudget!)}<span className="text-xs text-muted-foreground font-normal">/mo</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">not set</span>
        )}
        <Button
          variant="ghost" size="icon"
          className={cn(
            "h-7 w-7 flex-shrink-0 transition-opacity",
            hasbudget ? "opacity-0 group-hover:opacity-100" : "opacity-50 hover:opacity-100"
          )}
          onClick={() => openEdit(c)}
          title={hasbudget ? "Edit budget" : "Set budget"}
        >
          {hasbudget ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Budget</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your standing monthly spending limits — edit anytime as your needs change.
        </p>
      </div>

      {/* Total allocated */}
      {!isLoading && totalMonthly > 0 && (
        <div className="flex items-center gap-3 bg-card rounded-xl border p-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total budgeted per month</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalMonthly)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">{budgetedCategories.length} of {expenseCategories.length} categories</p>
            {unbudgetedCategories.length > 0 && (
              <p className="text-xs text-amber-600">{unbudgetedCategories.length} not yet set</p>
            )}
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Monthly Limits</h2>
          {!isLoading && unbudgetedCategories.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Click <Plus className="inline h-3 w-3" /> to set a limit
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
          </div>
        ) : expenseCategories.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No expense categories found. Add some in the Categories page first.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {budgetedCategories.map((c) => <CategoryRow key={c.id} c={c} />)}
            {budgetedCategories.length > 0 && unbudgetedCategories.length > 0 && (
              <div className="px-4 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground/60">
                No limit set
              </div>
            )}
            {unbudgetedCategories.map((c) => <CategoryRow key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {editTarget && (
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: editTarget.color }} />
              )}
              <DialogTitle>{editTarget?.name}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Label>Monthly limit ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This applies every month until you change it.
            </p>
          </div>
          <DialogFooter className="gap-2">
            {editTarget?.currentAmount !== null && (
              <Button type="button" variant="ghost" size="sm" className="mr-auto text-muted-foreground" onClick={handleClear} disabled={saving}>
                Clear
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
