"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Investment } from "@/types";

const INVESTMENT_TYPES = [
  { value: "brokerage", label: "Brokerage" },
  { value: "retirement_401k", label: "401(k)" },
  { value: "IRA", label: "Traditional IRA" },
  { value: "roth_IRA", label: "Roth IRA" },
  { value: "crypto", label: "Crypto" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

interface FormValues {
  name: string;
  type: string;
  currentValue: string;
  notes: string;
  isWheelAccount: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Investment | null;
}

export function InvestmentModal({ open, onClose, onSaved, editing }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: { name: "", type: "brokerage", currentValue: "", notes: "", isWheelAccount: false },
  });

  const selectedType = watch("type");
  const isWheelEligible = selectedType === "brokerage" || selectedType === "other";

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        currentValue: String(editing.currentValue),
        notes: editing.notes ?? "",
        isWheelAccount: editing.isWheelAccount,
      });
    } else {
      reset({ name: "", type: "brokerage", currentValue: "", notes: "", isWheelAccount: false });
    }
  }, [editing, open, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/fire/investments/${editing.id}` : "/api/fire/investments";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          currentValue: parseFloat(values.currentValue),
          isWheelAccount: values.isWheelAccount,
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Investment updated" : "Investment added");
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
          <DialogTitle>{editing ? "Edit Investment" : "Add Investment Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input placeholder="e.g. Fidelity Brokerage" {...register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller name="type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Current Value ($)</Label>
            <Controller name="currentValue" control={control} rules={{ required: true }}
              render={({ field }) => (
                <FormattedNumberInput value={field.value} onChange={field.onChange} placeholder="0" />
              )} />
          </div>

          {/* Wheel account toggle — only shown for taxable account types */}
          {isWheelEligible && (
            <Controller name="isWheelAccount" control={control} render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  field.value
                    ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Settings2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${field.value ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Use for Wheel Strategy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This account&apos;s balance counts toward your Wheel FIRE income calculations. Only taxable accounts can trade options.
                  </p>
                </div>
              </button>
            )} />
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="e.g. includes employer match" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : editing ? "Update" : "Add Account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
