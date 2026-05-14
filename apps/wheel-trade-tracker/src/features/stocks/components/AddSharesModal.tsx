"use client";

import * as React from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatMoney(n: number): string {
  return Number.isFinite(n) ? money(n) : "—";
}

export interface AddSharesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  avgCost: number;
}

export function AddSharesModal({
  open,
  onOpenChange,
  stockId,
  portfolioId,
  ticker,
  shares,
  avgCost,
}: AddSharesModalProps) {
  const [addedShares, setAddedShares] = React.useState<number>(0);
  const [costPerShare, setCostPerShare] = React.useState<{
    formatted: string;
    raw: number;
  }>({ formatted: "", raw: 0 });
  const [note, setNote] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (open) {
      setAddedShares(0);
      setCostPerShare({ formatted: "", raw: 0 });
      setNote("");
    }
  }, [open]);

  const validShares = Number.isFinite(addedShares) && addedShares > 0;
  const validCost = Number.isFinite(costPerShare.raw) && costPerShare.raw >= 0;

  const totalShares = validShares ? shares + addedShares : shares;
  const projectedAvg =
    validShares && validCost
      ? (avgCost * shares + costPerShare.raw * addedShares) / totalShares
      : NaN;
  const avgDelta = Number.isFinite(projectedAvg) ? projectedAvg - avgCost : NaN;
  const movingDown = Number.isFinite(avgDelta) && avgDelta < 0;

  async function handleSave() {
    if (!validShares) {
      toast.error("Shares to add must be a positive integer.");
      return;
    }
    if (!validCost) {
      toast.error("Please enter a valid price per share.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/stocks/${encodeURIComponent(stockId)}/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addedShares,
            costPerShare: costPerShare.raw,
            note: note.trim() || null,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to add shares (${res.status})`);
      }

      toast.success(`Added ${addedShares} sh to ${ticker}.`);
      onOpenChange(false);

      await Promise.allSettled([
        mutate(`/api/stocks/${stockId}`),
        mutate(`/api/stocks?portfolioId=${encodeURIComponent(portfolioId)}&status=open`),
        mutate(`/api/portfolios/${portfolioId}/metrics`),
        mutate(`/api/portfolios/${portfolioId}/detail-metrics`),
        mutate("/api/account/summary"),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add shares";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Shares</DialogTitle>
          <DialogDescription>
            Buy more shares into this lot and recompute the weighted-average cost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg border p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ticker</span>
              <span className="font-semibold">{ticker}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Shares</span>
              <span className="font-medium">{shares}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Avg Cost</span>
              <span className="font-medium">{money(avgCost)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addedShares">Shares to Add</Label>
            <Input
              id="addedShares"
              type="number"
              inputMode="numeric"
              min={1}
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={addedShares === 0 ? "" : addedShares.toString()}
              onChange={(e) => {
                const val = e.target.value;
                if (/^(0|[1-9][0-9]*)?$/.test(val)) {
                  setAddedShares(val === "" ? 0 : Number(val));
                }
              }}
              placeholder="e.g. 100"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="costPerShare">Price per Share</Label>
            <CurrencyInput
              value={costPerShare}
              onChange={setCostPerShare}
              placeholder="e.g. 145.50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. dip buy after earnings"
            />
          </div>

          <div className="bg-muted/50 rounded-lg border p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New Total Shares</span>
              <span className="font-medium">{totalShares}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Projected Avg Cost</span>
              <span className="font-medium">{formatMoney(projectedAvg)}</span>
            </div>
            {Number.isFinite(avgDelta) && (
              <div className="flex items-center justify-between pt-1 border-t border-border/60 mt-1">
                <span className="text-muted-foreground">
                  {movingDown ? "Average Down" : "Average Up"}
                </span>
                <span
                  className={
                    movingDown
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "font-semibold text-amber-600 dark:text-amber-400"
                  }
                >
                  {avgDelta >= 0 ? "+" : ""}
                  {money(avgDelta)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!validShares || !validCost || isSaving}
          >
            {isSaving ? "Adding…" : "Add Shares"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
