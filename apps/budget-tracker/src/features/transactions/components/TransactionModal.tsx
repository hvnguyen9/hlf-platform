"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
} from "@hlf/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useCategories } from "@/features/categories/hooks/useCategories";
import type { Transaction } from "@/types";

interface FormValues {
  amount: string;
  type: "income" | "expense";
  categoryId: string;
  description: string;
  notes: string;
  date: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Transaction | null;
}

export function TransactionModal({ open, onClose, onSaved, editing }: Props) {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      type: "expense",
      categoryId: "",
      description: "",
      notes: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        amount: String(editing.amount),
        type: editing.type,
        categoryId: editing.categoryId ?? "",
        description: editing.description ?? "",
        notes: editing.notes ?? "",
        date: editing.date.slice(0, 10),
      });
    } else {
      reset({ amount: "", type: "expense", categoryId: "", description: "", notes: "", date: format(new Date(), "yyyy-MM-dd") });
    }
  }, [editing, open, reset]);

  const selectedType = watch("type");
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both"
  );

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
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
          date: new Date(values.date + "T12:00:00").toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editing ? "Transaction updated" : "Transaction added");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={(v) => !v && onClose()}>
      <ResponsiveModalContent dialogClassName="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{editing ? "Edit Transaction" : "Add Transaction"}</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <>
                  <button
                    type="button"
                    onClick={() => field.onChange("expense")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      field.value === "expense"
                        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-700 dark:text-rose-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("income")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      field.value === "income"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Income
                  </button>
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { required: "Required", min: { value: 0.01, message: "Must be > 0" } })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
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
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Brief description (optional)" {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Additional notes (optional)" rows={2} {...register("notes")} />
          </div>

          <ResponsiveModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : editing ? "Update" : "Add Transaction"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
