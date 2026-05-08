"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import type { SavingsGoal } from "@/types";

interface FormValues {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: SavingsGoal | null;
}

export function SavingsGoalModal({ open, onClose, onSaved, editing }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { name: "", targetAmount: "", currentAmount: "0", deadline: "", description: "" },
  });

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        targetAmount: String(editing.targetAmount),
        currentAmount: String(editing.currentAmount),
        deadline: editing.deadline ? editing.deadline.slice(0, 10) : "",
        description: editing.description ?? "",
      });
    } else {
      reset({ name: "", targetAmount: "", currentAmount: "0", deadline: "", description: "" });
    }
  }, [editing, open, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/fire/savings-goals/${editing.id}` : "/api/fire/savings-goals";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          targetAmount: parseFloat(values.targetAmount),
          currentAmount: parseFloat(values.currentAmount) || 0,
          deadline: values.deadline ? new Date(values.deadline + "T12:00:00").toISOString() : null,
          description: values.description || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Goal updated" : "Goal created");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Savings Goal" : "Add Savings Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Goal Name</Label>
            <Input placeholder="e.g. Emergency Fund, Down Payment" {...register("name", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target Amount ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="10000" {...register("targetAmount", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Amount ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0" {...register("currentAmount")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline (optional)</Label>
            <Controller name="deadline" control={control} render={({ field }) => (
              <DatePicker value={field.value} onChange={field.onChange} />
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea placeholder="e.g. 6 months of expenses" rows={2} {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : editing ? "Update" : "Create Goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
