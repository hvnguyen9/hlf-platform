"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@hlf/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { describeConfig } from "@/lib/alerts/types";

type LotMode = "pctBelowAvg" | "pctAboveAvg" | "absolute";
type AbsoluteDirection = "below" | "above";

interface LotAlertConfigRow {
  id: string;
  type: "LOT_PRICE_BREACH";
  enabled: boolean;
  params: unknown;
  lastFiredAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Container-agnostic stock-lot alerts UI: list of price-breach alerts with
 * toggle + remove, plus an inline "add new" form. Mount inside whatever
 * surface makes sense.
 */
export function LotAlertsManager({
  stockLotId,
  ticker,
  avgCost,
  defaultAdding = false,
}: {
  stockLotId: string;
  ticker: string;
  avgCost: number;
  /** Start with the add-form expanded. */
  defaultAdding?: boolean;
}) {
  const { data, mutate, isLoading } = useSWR<{ configs: LotAlertConfigRow[] }>(
    `/api/alerts/configs?stockLotId=${encodeURIComponent(stockLotId)}`,
    fetcher,
  );
  const configs = data?.configs ?? [];
  const [adding, setAdding] = useState(defaultAdding);

  async function toggleEnabled(c: LotAlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    if (res.ok) mutate();
    else toast.error("Failed to toggle alert");
  }

  async function remove(c: LotAlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, { method: "DELETE" });
    if (res.ok) mutate();
    else toast.error("Failed to remove alert");
  }

  return (
    <div className="flex flex-col gap-3">
      {(isLoading || configs.length > 0) && (
        <div className="max-h-[40vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {configs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/40"
                >
                  <Switch checked={c.enabled} onCheckedChange={() => toggleEnabled(c)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground truncate">
                      {describeConfig(c.type, c.params)}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => remove(c)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!adding && configs.length > 0 && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add another alert
        </Button>
      )}

      {adding && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New alert
            </span>
            {configs.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setAdding(false)}
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <AddLotAlertForm
            stockLotId={stockLotId}
            ticker={ticker}
            avgCost={avgCost}
            onCreated={() => {
              mutate();
              setAdding(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function AddLotAlertForm({
  stockLotId,
  ticker: _ticker,
  avgCost,
  onCreated,
}: {
  stockLotId: string;
  ticker: string;
  avgCost: number;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<LotMode>("pctBelowAvg");
  const [pctBelow, setPctBelow] = useState<number | null>(10);
  const [pctAbove, setPctAbove] = useState<number | null>(10);
  const [absoluteDirection, setAbsoluteDirection] = useState<AbsoluteDirection>("above");
  const [absolutePrice, setAbsolutePrice] = useState<number | null>(
    Number.isFinite(avgCost) && avgCost > 0 ? Number((avgCost * 1.1).toFixed(2)) : null,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const params = (() => {
        if (mode === "pctBelowAvg") return { mode, pct: pctBelow ?? 0 };
        if (mode === "pctAboveAvg") return { mode, pct: pctAbove ?? 0 };
        return {
          mode: "absolute" as const,
          triggerPrice: absolutePrice ?? 0,
          direction: absoluteDirection,
        };
      })();

      const res = await fetch("/api/alerts/configs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "LOT_PRICE_BREACH", stockLotId, params }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to add alert");
        return;
      }
      onCreated();
      toast.success("Alert added");
    } finally {
      setSaving(false);
    }
  }

  const projectedThreshold =
    mode === "pctBelowAvg" && pctBelow != null && avgCost > 0
      ? avgCost * (1 - pctBelow / 100)
      : mode === "pctAboveAvg" && pctAbove != null && avgCost > 0
        ? avgCost * (1 + pctAbove / 100)
        : null;

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
        Avg cost: <span className="font-semibold text-foreground">${avgCost.toFixed(2)}</span>
      </div>

      <div>
        <Label className="text-xs">Trigger when</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as LotMode)}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pctBelowAvg">Drops below avg by %</SelectItem>
            <SelectItem value="pctAboveAvg">Rises above avg by %</SelectItem>
            <SelectItem value="absolute">Crosses an exact level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "pctBelowAvg" && (
        <div>
          <Label className="text-xs">% below avg cost</Label>
          <NumberInput
            min={0.1}
            max={90}
            step={0.5}
            value={pctBelow}
            onValueChange={setPctBelow}
            className="mt-1 h-8"
          />
          {projectedThreshold !== null && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Fires at ${projectedThreshold.toFixed(2)} or below.
            </p>
          )}
        </div>
      )}

      {mode === "pctAboveAvg" && (
        <div>
          <Label className="text-xs">% above avg cost</Label>
          <NumberInput
            min={0.1}
            max={500}
            step={0.5}
            value={pctAbove}
            onValueChange={setPctAbove}
            className="mt-1 h-8"
          />
          {projectedThreshold !== null && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Fires at ${projectedThreshold.toFixed(2)} or above.
            </p>
          )}
        </div>
      )}

      {mode === "absolute" && (
        <>
          <div>
            <Label className="text-xs">Direction</Label>
            <Select
              value={absoluteDirection}
              onValueChange={(v) => setAbsoluteDirection(v as AbsoluteDirection)}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="below">Below</SelectItem>
                <SelectItem value="above">Above</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Trigger price</Label>
            <NumberInput
              min={0.01}
              step={0.01}
              value={absolutePrice}
              onValueChange={setAbsolutePrice}
              className="mt-1 h-8"
            />
          </div>
        </>
      )}

      <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Add alert"}
      </Button>
    </div>
  );
}
