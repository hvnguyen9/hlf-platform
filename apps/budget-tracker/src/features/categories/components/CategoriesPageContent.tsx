"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { CategoryModal } from "./CategoryModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";
import type { Category } from "@/types";

export function CategoriesPageContent() {
  const { categories, isLoading, mutate } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");
  const bothCategories = categories.filter((c) => c.type === "both");

  function openAdd() { setEditing(null); setModalOpen(true); }
  function openEdit(c: Category) { setEditing(c); setModalOpen(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Category deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function CategoryRow({ c }: { c: Category }) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 group transition-colors">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: c.color + "20" }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{c.name}</p>
            {c.isSavings && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium leading-none">
                savings
              </span>
            )}
            {!c.isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium leading-none">
                custom
              </span>
            )}
          </div>
          {c.monthlyBudget && (
            <p className="text-xs text-muted-foreground">Budget: {formatCurrency(c.monthlyBudget)}/mo</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!c.isDefault && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(c)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  function Section({ title, items }: { title: string; items: Category[] }) {
    if (items.length === 0) return null;
    const customCount = items.filter((c) => !c.isDefault).length;
    return (
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {customCount > 0 && (
            <span className="text-xs text-muted-foreground">{customCount} custom</span>
          )}
        </div>
        <div className="divide-y divide-border">
          {items.map((c) => <CategoryRow key={c.id} c={c} />)}
        </div>
      </div>
    );
  }

  const totalCustom = categories.filter((c) => !c.isDefault).length;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {categories.length} categories · {totalCustom} custom
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Expense Categories" items={expenseCategories} />
          <Section title="Income Categories" items={incomeCategories} />
          {bothCategories.length > 0 && (
            <Section title="Both" items={bothCategories} />
          )}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => mutate()}
        editing={editing}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Transactions in this category will become uncategorized. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
