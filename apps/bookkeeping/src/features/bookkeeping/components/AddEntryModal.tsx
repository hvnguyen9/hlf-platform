"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@hlf/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/types";
import { formatCurrency } from "@/lib/utils";
import type { BookkeepingEntry, EntryType } from "@/types";

type FormValues = {
  name: string;
  amount: string;
  description: string;
  date: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BookkeepingEntry;
  onSuccess: () => void;
};

export function AddEntryModal({ open, onOpenChange, entry, onSuccess }: Props) {
  const isEdit = Boolean(entry?.id);
  const [selectedType, setSelectedType] = useState<EntryType>(entry?.type ?? "income");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [recurring, setRecurring] = useState(entry?.recurring ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: entry?.name ?? "",
      amount: entry ? String(entry.amount) : "",
      description: entry?.description ?? "",
      date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    },
  });

  // Re-populate form and local state every time the modal opens with a (potentially different) entry
  useEffect(() => {
    if (open) {
      setSelectedType(entry?.type ?? "income");
      setCategory(entry?.category ?? "");
      setRecurring(entry?.recurring ?? false);
      reset({
        name: entry?.name ?? "",
        amount: entry ? String(entry.amount) : "",
        description: entry?.description ?? "",
        date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, entry, reset]);

  const amountValue = parseFloat(watch("amount") || "0");
  const annualProjection = recurring && amountValue > 0 ? amountValue * 12 : 0;
  const categories = selectedType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a positive amount. For refunds or money returned, use the Expense type with 'Refund / Reversal' category.");
      setSubmitting(false);
      return;
    }
    if (!category) {
      toast.error("Select a category");
      setSubmitting(false);
      return;
    }

    const payload = {
      type: selectedType,
      name: values.name.trim() || null,
      category,
      amount,
      description: values.description.trim() || null,
      date: values.date,
      recurring,
    };

    const url = isEdit ? `/api/bookkeeping/${entry!.id}` : "/api/bookkeeping";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(isEdit ? "Entry updated" : "Entry added");
      onSuccess();
      if (addAnother) {
        // Keep type, category, date, and recurring — clear name, amount, notes
        reset({
          name: "",
          amount: "",
          description: "",
          date: values.date,
        });
        setAddAnother(false);
        // Focus name field after a tick
        setTimeout(() => {
          document.getElementById("entry-name")?.focus();
        }, 50);
      } else {
        reset();
        onOpenChange(false);
      }
    } else {
      toast.error("Something went wrong");
    }
    setSubmitting(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent dialogClassName="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEdit ? "Edit Entry" : "Add Entry"}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setSelectedType(t); setCategory(""); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  selectedType === t
                    ? t === "income"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-red-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-name">Name</Label>
            <Input
              id="entry-name"
              placeholder={selectedType === "income" ? "e.g. April's trading profits" : "e.g. ChatGPT subscription"}
              {...register("name")}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{recurring ? "Monthly amount ($)" : "Amount ($)"}</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount", { required: true })}
                className={errors.amount ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Controller
                name="date"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea id="description" placeholder="Any additional notes…" rows={2} {...register("description")} />
          </div>

          {/* Monthly recurring toggle */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                recurring
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 flex-shrink-0 ${recurring ? "text-primary" : ""}`} />
              <span className="font-medium">Monthly recurring</span>
              {recurring && annualProjection > 0 && (
                <span className="text-xs font-normal text-primary/80">
                  {formatCurrency(amountValue)}/mo = {formatCurrency(annualProjection)}/yr
                </span>
              )}
              <div className={`ml-auto w-8 h-4 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${recurring ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${recurring ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>
            {recurring && (
              <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                Enter the monthly amount. It&apos;s recorded once and automatically counted as{" "}
                <strong>× 12 in all yearly totals</strong> — no need to re-add it each month.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {!isEdit && (
              <Button
                type="submit"
                variant="outline"
                className="flex-1 border-primary/40 text-primary hover:bg-primary/5"
                disabled={submitting || !category}
                onClick={() => setAddAnother(true)}
              >
                {submitting && addAnother ? "Saving…" : "Save & Add Another"}
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting || !category}
              onClick={() => setAddAnother(false)}
            >
              {submitting && !addAnother ? "Saving…" : isEdit ? "Save Changes" : "Save"}
            </Button>
          </div>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
