"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetWorthSnapshotModal } from "./NetWorthSnapshotModal";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { NetWorthSnapshot } from "@/types";

interface Props {
  snapshot: NetWorthSnapshot | null;
  onLogSnapshot: () => void;
}

export function NetWorthCard({ snapshot, onLogSnapshot }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Net Worth</h2>
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Log Snapshot
          </Button>
        </div>
        {snapshot ? (
          <div className="space-y-2">
            <p className={cn("text-3xl font-bold", snapshot.netWorth >= 0 ? "text-primary" : "text-destructive")}>
              {formatCurrency(snapshot.netWorth)}
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Assets</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(snapshot.totalAssets)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Liabilities</p>
                <p className="font-semibold text-rose-600">{formatCurrency(snapshot.totalLiabilities)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">As of {formatDate(snapshot.date)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No snapshots yet. Log your first net worth snapshot.</p>
        )}
      </div>
      <NetWorthSnapshotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { onLogSnapshot(); setModalOpen(false); }}
      />
    </>
  );
}
