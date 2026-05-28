"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SavingsGoal } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  surplus: number;
  goals: SavingsGoal[];
}

export function AllocateSurplusModal({ open, onClose, onSaved, surplus, goals }: Props) {
  const active = goals.filter((g) => !g.isCompleted);
  const [goalId, setGoalId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = active.find((g) => g.id === goalId) ?? null;
  const remaining = selected ? Math.max(0, selected.targetAmount - selected.currentAmount) : 0;

  useEffect(() => {
    if (open) {
      const first = active[0] ?? null;
      setGoalId(first?.id ?? "");
      const rem = first ? Math.max(0, first.targetAmount - first.currentAmount) : 0;
      setAmount(String(Math.round(Math.min(surplus, rem || surplus) * 100) / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectGoal(g: SavingsGoal) {
    setGoalId(g.id);
    const rem = Math.max(0, g.targetAmount - g.currentAmount);
    setAmount(String(Math.round(Math.min(surplus, rem || surplus) * 100) / 100));
  }

  async function handleSave() {
    if (!selected) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/fire/savings-goals/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAmount: selected.currentAmount + amt,
          isCompleted: selected.currentAmount + amt >= selected.targetAmount,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Added ${formatCurrency(amt)} to ${selected.name}`);
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to allocate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={(v) => !v && onClose()}>
      <ResponsiveModalContent dialogClassName="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Put your surplus to work</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{formatCurrency(surplus)}</span> left over
            this month. Move some of it toward a savings goal.
          </p>

          <div className="space-y-2">
            <Label>Goal</Label>
            <div className="space-y-1.5">
              {active.map((g) => {
                const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectGoal(g)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors",
                      goalId === g.id ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{g.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allocate-amount">Amount to add ($)</Label>
            <Input
              id="allocate-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {selected && remaining > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setAmount(String(Math.round(Math.min(surplus, remaining) * 100) / 100))}
              >
                Fill to goal — {formatCurrency(Math.min(surplus, remaining))}
              </button>
            )}
          </div>
        </div>

        <ResponsiveModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !selected}>
            {saving ? "Saving…" : "Allocate"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
