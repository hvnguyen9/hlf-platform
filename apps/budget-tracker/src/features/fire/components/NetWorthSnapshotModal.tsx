"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

interface FormValues {
  date: string;
  totalAssets: string;
  totalLiabilities: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function NetWorthSnapshotModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), totalAssets: "", totalLiabilities: "", notes: "" },
  });

  const assets = parseFloat(watch("totalAssets") || "0");
  const liabilities = parseFloat(watch("totalLiabilities") || "0");
  const netWorth = assets - liabilities;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/fire/net-worth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(values.date + "T12:00:00").toISOString(),
          totalAssets: parseFloat(values.totalAssets),
          totalLiabilities: parseFloat(values.totalLiabilities),
          notes: values.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Net worth snapshot logged");
      onSaved();
    } catch {
      toast.error("Failed to save snapshot");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Net Worth Snapshot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Controller name="date" control={control} render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Total Assets ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("totalAssets", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Liabilities ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("totalLiabilities", { required: true })} />
            </div>
          </div>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            <span className="text-muted-foreground">Net Worth: </span>
            <span className={`font-bold ${netWorth >= 0 ? "text-primary" : "text-destructive"}`}>
              ${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="e.g. included new investment account" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Log Snapshot"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
