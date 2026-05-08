"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/types";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#f59e0b", "#10b981", "#06b6d4", "#0ea5e9", "#64748b",
  "#84cc16", "#a855f7", "#e11d48", "#0891b2", "#94a3b8",
];

interface FormValues {
  name: string;
  type: "income" | "expense" | "both";
  color: string;
  icon: string;
  monthlyBudget: string;
  isSavings: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Category | null;
}

export function CategoryModal({ open, onClose, onSaved, editing }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", type: "expense", color: "#6366f1", icon: "tag", monthlyBudget: "", isSavings: false },
  });

  const selectedColor = watch("color");
  const selectedType = watch("type");

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        color: editing.color,
        icon: editing.icon,
        monthlyBudget: editing.monthlyBudget ? String(editing.monthlyBudget) : "",
        isSavings: editing.isSavings,
      });
    } else {
      reset({ name: "", type: "expense", color: "#6366f1", icon: "tag", monthlyBudget: "", isSavings: false });
    }
  }, [editing, open, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          color: values.color,
          icon: values.icon,
          monthlyBudget: values.monthlyBudget ? parseFloat(values.monthlyBudget) : null,
          isSavings: values.isSavings,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Category updated" : "Category created");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Category name" {...register("name", { required: "Required" })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Controller name="type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Savings toggle — only relevant for expense/both categories */}
          {(selectedType === "expense" || selectedType === "both") && (
            <Controller name="isSavings" control={control} render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  field.value
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  field.value ? "border-primary bg-primary" : "border-muted-foreground/40"
                }`}>
                  {field.value && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5L8.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Count as savings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Money going here counts toward your savings rate — not as spending. Use for 401k, emergency fund, investing, etc.
                  </p>
                </div>
              </button>
            )} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : editing ? "Update" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
