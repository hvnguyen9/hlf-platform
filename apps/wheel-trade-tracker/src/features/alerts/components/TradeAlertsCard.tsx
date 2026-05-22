"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@hlf/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALERT_TYPE_LABEL, describeConfig } from "@/lib/alerts/types";

type ConfigType = "PROFIT_TARGET" | "ASSIGNMENT_RISK" | "ROLL_OPPORTUNITY";

interface AlertConfigRow {
  id: string;
  type: ConfigType;
  enabled: boolean;
  params: unknown;
  lastFiredAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Container-agnostic trade alerts UI: list of configured alerts with toggle
 * + remove, plus an inline "add new" form. Mount inside whatever surface
 * makes sense (popover, sheet, modal).
 */
export function TradeAlertsManager({
  tradeId,
  defaultAdding = false,
}: {
  tradeId: string;
  /** Start with the add-form expanded. Useful when the entry point is "Add Alert". */
  defaultAdding?: boolean;
}) {
  const { data, mutate, isLoading } = useSWR<{ configs: AlertConfigRow[] }>(
    `/api/alerts/configs?tradeId=${encodeURIComponent(tradeId)}`,
    fetcher,
  );
  const configs = data?.configs ?? [];
  const [adding, setAdding] = useState(defaultAdding);

  async function toggleEnabled(c: AlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    if (res.ok) mutate();
    else toast.error("Failed to toggle alert");
  }

  async function remove(c: AlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, { method: "DELETE" });
    if (res.ok) mutate();
    else toast.error("Failed to remove alert");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Existing-configs list — only shown when there's something to show.
          The host modal renders the title/description above. */}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {ALERT_TYPE_LABEL[c.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {describeConfig(c.type, c.params)}
                      </span>
                    </div>
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

      {/* Add another button — only when we're already showing existing configs
          and the form isn't visible. Empty state opens the form directly. */}
      {!adding && configs.length > 0 && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add another alert
        </Button>
      )}

      {/* Inline add-form, expanded by default when entered from the FAB. */}
      {adding && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New alert
            </span>
            {/* Only show cancel if there are existing alerts to fall back to.
                When the list is empty, "cancel" leaves the user with nothing,
                which is confusing in a one-shot "Add Alert" entry from the FAB. */}
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
          <AddTradeAlertForm
            tradeId={tradeId}
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

function AddTradeAlertForm({
  tradeId,
  onCreated,
}: {
  tradeId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<ConfigType>("PROFIT_TARGET");
  const [profitPct, setProfitPct] = useState<number | null>(80);
  const [withinPctOfStrike, setWithinPctOfStrike] = useState<number | null>(2);
  const [riskMaxDte, setRiskMaxDte] = useState<number | null>(21);
  const [rollMaxDte, setRollMaxDte] = useState<number | null>(7);
  const [minOtmPct, setMinOtmPct] = useState<number | null>(2);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const params = (() => {
        if (type === "PROFIT_TARGET") return { profitPct: profitPct ?? 0 };
        if (type === "ASSIGNMENT_RISK")
          return {
            withinPctOfStrike: withinPctOfStrike ?? 0,
            maxDte: riskMaxDte ?? 0,
          };
        return { maxDte: rollMaxDte ?? 0, minOtmPct: minOtmPct ?? 0 };
      })();

      const res = await fetch("/api/alerts/configs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, tradeId, params }),
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

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as ConfigType)}>
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PROFIT_TARGET">Profit target</SelectItem>
            <SelectItem value="ASSIGNMENT_RISK">Assignment risk</SelectItem>
            <SelectItem value="ROLL_OPPORTUNITY">Roll opportunity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === "PROFIT_TARGET" && (
        <div>
          <Label className="text-xs">Profit % to trigger at</Label>
          <NumberInput
            min={1}
            max={99}
            value={profitPct}
            onValueChange={setProfitPct}
            className="mt-1 h-8"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Estimated from time-decay; conservative for OTM positions.
          </p>
        </div>
      )}

      {type === "ASSIGNMENT_RISK" && (
        <>
          <div>
            <Label className="text-xs">Within (% of strike)</Label>
            <NumberInput
              min={0}
              max={50}
              step={0.5}
              value={withinPctOfStrike}
              onValueChange={setWithinPctOfStrike}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Only when DTE ≤</Label>
            <NumberInput
              min={0}
              max={365}
              allowDecimal={false}
              value={riskMaxDte}
              onValueChange={setRiskMaxDte}
              className="mt-1 h-8"
            />
          </div>
        </>
      )}

      {type === "ROLL_OPPORTUNITY" && (
        <>
          <div>
            <Label className="text-xs">When DTE ≤</Label>
            <NumberInput
              min={0}
              max={60}
              allowDecimal={false}
              value={rollMaxDte}
              onValueChange={setRollMaxDte}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label className="text-xs">And OTM ≥ (%)</Label>
            <NumberInput
              min={0}
              max={50}
              step={0.5}
              value={minOtmPct}
              onValueChange={setMinOtmPct}
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
