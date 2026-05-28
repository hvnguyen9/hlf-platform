"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { PiggyBank, Landmark } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { quarterForDate } from "@/lib/taxReserve";
import type { TaxReserveEntry, TaxReserveKind } from "@/types";

type FormValues = { amount: string; note: string; date: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  entry?: TaxReserveEntry;
  defaultKind?: TaxReserveKind;
  defaultQuarter?: number;
  onSuccess: () => void;
};

export function AddReserveModal({ open, onOpenChange, year, entry, defaultKind, defaultQuarter, onSuccess }: Props) {
  const isEdit = Boolean(entry?.id);
  const [kind, setKind] = useState<TaxReserveKind>(entry?.kind ?? defaultKind ?? "parked");
  const [quarter, setQuarter] = useState<number | null>(entry?.quarter ?? defaultQuarter ?? null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, control, watch } = useForm<FormValues>({
    defaultValues: {
      amount: entry ? String(entry.amount) : "",
      note: entry?.note ?? "",
      date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (open) {
      setKind(entry?.kind ?? defaultKind ?? "parked");
      setQuarter(entry?.quarter ?? defaultQuarter ?? null);
      reset({
        amount: entry ? String(entry.amount) : "",
        note: entry?.note ?? "",
        date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, entry, defaultKind, defaultQuarter, reset]);

  const dateValue = watch("date");

  // For a payment, default the quarter to whichever the date falls in (unless the user picked one)
  useEffect(() => {
    if (kind === "paid" && quarter === null && dateValue) {
      setQuarter(quarterForDate(year, dateValue));
    }
  }, [kind, dateValue, year, quarter]);

  async function onSubmit(values: FormValues) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setSubmitting(true);

    const payload = {
      year,
      date: values.date,
      amount,
      kind,
      quarter: kind === "paid" ? quarter : null,
      note: values.note.trim() || null,
    };

    const url = isEdit ? `/api/tax-reserve/${entry!.id}` : "/api/tax-reserve";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(isEdit ? "Reserve entry updated" : kind === "paid" ? "Payment logged" : "Set-aside logged");
      onSuccess();
      reset();
      onOpenChange(false);
    } else {
      toast.error("Something went wrong");
    }
    setSubmitting(false);
  }

  const KINDS: { id: TaxReserveKind; label: string; icon: React.ElementType; hint: string }[] = [
    { id: "parked", label: "Set aside", icon: PiggyBank, hint: "Moved to a tax savings reserve" },
    { id: "paid", label: "Paid to IRS/FTB", icon: Landmark, hint: "Estimated payment actually sent" },
  ];

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent dialogClassName="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEdit ? "Edit Reserve Entry" : "Log Tax Reserve"}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Kind toggle */}
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors",
                  kind === id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className={cn("h-3.5 w-3.5", kind === id && "text-primary")} />
                  {label}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reserve-amount">Amount ($)</Label>
              <Input id="reserve-amount" type="text" inputMode="decimal" placeholder="0.00" {...register("amount", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Controller
                name="date"
                control={control}
                rules={{ required: true }}
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          {/* Quarter — only for payments */}
          {kind === "paid" && (
            <div className="space-y-1.5">
              <Label>Applies to quarter</Label>
              <Select value={quarter ? String(quarter) : ""} onValueChange={(v) => setQuarter(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 — due April 15</SelectItem>
                  <SelectItem value="2">Q2 — due June 16</SelectItem>
                  <SelectItem value="3">Q3 — due September 15</SelectItem>
                  <SelectItem value="4">Q4 — due January 15</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="reserve-note">Note (optional)</Label>
            <Textarea id="reserve-note" placeholder="e.g. transfer to tax HYSA, EFTPS confirmation #…" rows={2} {...register("note")} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Log Entry"}
            </Button>
          </div>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
