"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Repeat2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/features/categories/hooks/useCategories";
import type { RecurringTransaction } from "@/types";

interface FormValues {
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  description: string;
  notes: string;
  dayOfMonth: string;
}

export interface RecurringPrefill {
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  description: string | null;
  dayOfMonth: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: RecurringTransaction | null;
  prefill?: RecurringPrefill | null;
}

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function ordinalLabel(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function RecurringModal({ open, onClose, onSaved, editing, prefill }: Props) {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { amount: "", type: "expense", categoryId: "", description: "", notes: "", dayOfMonth: "1" },
  });

  useEffect(() => {
    if (editing) {
      reset({
        amount: String(editing.amount),
        type: editing.type,
        categoryId: editing.categoryId ?? "",
        description: editing.description ?? "",
        notes: editing.notes ?? "",
        dayOfMonth: String(editing.dayOfMonth),
      });
    } else if (prefill) {
      reset({
        amount: String(prefill.amount),
        type: prefill.type,
        categoryId: prefill.categoryId ?? "",
        description: prefill.description ?? "",
        notes: "",
        dayOfMonth: String(Math.min(28, prefill.dayOfMonth)),
      });
    } else {
      reset({ amount: "", type: "expense", categoryId: "", description: "", notes: "", dayOfMonth: "1" });
    }
  }, [editing, prefill, open, reset]);

  const selectedType = watch("type");
  const filteredCategories = categories.filter((c) => c.type === selectedType || c.type === "both");

  const isElevating = !editing && !!prefill;
  const title = editing ? "Edit Recurring Item" : isElevating ? "Make Recurring" : "Add Recurring Item";
  const submitLabel = editing ? "Update" : isElevating ? "Make Recurring" : "Add Recurring";

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/recurring/${editing.id}` : "/api/recurring";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(values.amount),
          type: values.type,
          categoryId: values.categoryId || null,
          description: values.description || null,
          notes: values.notes || null,
          dayOfMonth: parseInt(values.dayOfMonth),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Recurring item updated" : "Recurring item added");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isElevating && <Repeat2 className="h-4 w-4 text-primary" />}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {isElevating && (
            <p className="text-sm text-muted-foreground">
              This will repeat automatically every month. The original one-time entry will be removed to avoid double-counting.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            <Controller name="type" control={control} render={({ field }) => (
              <>
                <button type="button" onClick={() => field.onChange("expense")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${field.value === "expense" ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-400" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  Expense
                </button>
                <button type="button" onClick={() => field.onChange("income")}
                  className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${field.value === "income" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  Income
                </button>
              </>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00"
                {...register("amount", { required: "Required", min: { value: 0.01, message: "Must be > 0" } })} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Day of Month</Label>
              <Controller name="dayOfMonth" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>{ordinalLabel(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              <p className="text-xs text-muted-foreground">Max 28th to cover all months</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="e.g. Rent, Netflix, Salary" {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes" rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
