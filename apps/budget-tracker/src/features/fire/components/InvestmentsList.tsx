"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { InvestmentModal } from "./InvestmentModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Investment } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  brokerage: "Brokerage",
  retirement_401k: "401(k)",
  IRA: "Traditional IRA",
  roth_IRA: "Roth IRA",
  crypto: "Crypto",
  real_estate: "Real Estate",
  other: "Other",
};

interface Props {
  investments: Investment[];
  totalInvestable: number;
  onMutate: () => void;
}

export function InvestmentsList({ investments, totalInvestable, onMutate }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);

  const wheelTotal = investments.filter((i) => i.isWheelAccount).reduce((s, i) => s + i.currentValue, 0);

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/fire/investments/${id}`, { method: "DELETE" });
      toast.success("Investment removed");
      onMutate();
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function toggleWheel(inv: Investment) {
    try {
      await fetch(`/api/fire/investments/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWheelAccount: !inv.isWheelAccount }),
      });
      onMutate();
    } catch {
      toast.error("Failed to update");
    }
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Investment Accounts</h2>
            <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>Total: <span className="text-foreground font-medium">{formatCurrency(totalInvestable)}</span></span>
              {wheelTotal > 0 && (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Settings2 className="h-3 w-3" /> Wheel: {formatCurrency(wheelTotal)}
                </span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>

        {investments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No investment accounts yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {investments.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-muted/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{inv.name}</p>
                    {inv.isWheelAccount && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium leading-none flex items-center gap-1">
                        <Settings2 className="h-2.5 w-2.5" /> Wheel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[inv.type] ?? inv.type}</p>
                </div>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  inv.isWheelAccount ? "text-emerald-600" : "text-primary"
                )}>
                  {formatCurrency(inv.currentValue)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className={cn("h-7 w-7", inv.isWheelAccount ? "text-emerald-600" : "text-muted-foreground")}
                        onClick={() => toggleWheel(inv)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {inv.isWheelAccount ? "Remove from Wheel" : "Use for Wheel Strategy"}
                    </TooltipContent>
                  </Tooltip>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(inv); setModalOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <InvestmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { onMutate(); setModalOpen(false); }}
        editing={editing}
      />
    </>
  );
}
