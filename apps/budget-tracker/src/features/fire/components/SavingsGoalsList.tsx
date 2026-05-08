"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { SavingsGoalModal } from "./SavingsGoalModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SavingsGoal } from "@/types";

interface Props {
  goals: SavingsGoal[];
  onMutate: () => void;
}

export function SavingsGoalsList({ goals, onMutate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/fire/savings-goals/${id}`, { method: "DELETE" });
      toast.success("Goal deleted");
      onMutate();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function toggleComplete(goal: SavingsGoal) {
    try {
      await fetch(`/api/fire/savings-goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !goal.isCompleted }),
      });
      onMutate();
    } catch {
      toast.error("Failed to update");
    }
  }

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  function GoalRow({ goal }: { goal: SavingsGoal }) {
    const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    return (
      <div className={cn("px-4 py-3 group hover:bg-muted/40 transition-colors", goal.isCompleted && "opacity-60")}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleComplete(goal)}
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
              goal.isCompleted ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40 hover:border-primary"
            )}
          >
            {goal.isCompleted && <Check className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-medium text-foreground", goal.isCompleted && "line-through")}>{goal.name}</p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(goal); setModalOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
              {goal.deadline && <span>Due {formatDate(goal.deadline)}</span>}
            </div>
            <Progress value={pct} className={cn("h-1.5", goal.isCompleted && "[&>div]:bg-emerald-500")} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Savings Goals</h2>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Goal
          </Button>
        </div>
        {goals.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No savings goals yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {active.map((g) => <GoalRow key={g.id} goal={g} />)}
            {completed.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground">Completed</div>
                {completed.map((g) => <GoalRow key={g.id} goal={g} />)}
              </>
            )}
          </div>
        )}
      </div>
      <SavingsGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { onMutate(); setModalOpen(false); }}
        editing={editing}
      />
    </>
  );
}
