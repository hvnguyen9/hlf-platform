"use client";

import { useState } from "react";
import { Pencil, Trash2, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
  onMakeRecurring: () => void;
}

export function TransactionRow({ transaction: t, onEdit, onDelete, onMakeRecurring }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Transaction deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 group transition-colors">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: t.category?.color ?? "#94a3b8" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">
              {t.description || t.category?.name || "Uncategorized"}
            </p>
            {t.isRecurring && (
              <Repeat2 className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t.category?.name ?? "Uncategorized"} · {formatDateShort(t.date)}
          </p>
        </div>
        <span className={cn(
          "text-sm font-semibold tabular-nums flex-shrink-0",
          t.type === "income" ? "text-emerald-600" : "text-rose-600"
        )}>
          {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
        </span>

        {t.isRecurring ? (
          <div className="w-[66px] flex-shrink-0" />
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onMakeRecurring}>
                  <Repeat2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Make recurring</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
