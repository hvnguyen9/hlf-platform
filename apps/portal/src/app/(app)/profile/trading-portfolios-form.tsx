"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Button } from "@hlf/ui/button";
import { cn } from "@/lib/utils";

export type Portfolio = { id: string; name: string };
export type Selection = "all" | string[];

type Props = {
  initialSelection: Selection;
  portfolios: Portfolio[];
  availableError?: string;
};

export function TradingPortfoliosForm({
  initialSelection,
  portfolios,
  availableError,
}: Props) {
  // One state, two shapes: "all" or a list of explicit IDs. Always visible —
  // the "All" tile and the individual tiles live in the same scroll list, so
  // nothing appears/disappears as you toggle.
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [saving, setSaving] = useState(false);

  const isAll = selection === "all";
  const ids = isAll ? [] : selection;

  function selectAll() {
    setSelection("all");
  }

  // Selecting an individual NEVER auto-promotes to "all" — even if every
  // portfolio ends up checked — because that's the bug we're moving away
  // from. Deselecting the last one falls back to "all" so we don't sit in
  // an invalid empty state.
  function toggleOne(id: string) {
    if (isAll) {
      setSelection([id]);
      return;
    }
    if (ids.includes(id)) {
      const next = ids.filter((x) => x !== id);
      setSelection(next.length === 0 ? "all" : next);
    } else {
      setSelection([...ids, id]);
    }
  }

  const dirty =
    isAll !== (initialSelection === "all") ||
    (!isAll &&
      initialSelection !== "all" &&
      !sortedEqual(ids, initialSelection));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/trading-portfolios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Trading portfolios updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = isAll ? portfolios.length : ids.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Trading portfolios
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
          Which Wheel Tracker portfolios count toward cross-app trading P&amp;L
          rollups. Affects the portal dashboard and bookkeeping&apos;s trading
          income auto-pull. Wheel Tracker&apos;s own UI is unaffected.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <PortfolioTile
            selected={isAll}
            onClick={selectAll}
            title="All portfolios"
            description="Include every portfolio's realized P&L"
          />

          {portfolios.length > 0 && (
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                or select specific
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {availableError && portfolios.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 px-1 py-2">
              Couldn&apos;t reach Wheel Tracker to list portfolios: {availableError}
            </p>
          )}
          {!availableError && portfolios.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">
              No portfolios found in Wheel Tracker yet.
            </p>
          )}

          {portfolios.map((p) => (
            <PortfolioTile
              key={p.id}
              selected={!isAll && ids.includes(p.id)}
              onClick={() => toggleOne(p.id)}
              title={p.name}
            />
          ))}

          <div className="flex items-center justify-between pt-3">
            <p className="text-xs text-muted-foreground">
              {isAll
                ? portfolios.length > 0
                  ? `All ${portfolios.length} portfolios included`
                  : "All portfolios included"
                : `${selectedCount} of ${portfolios.length} portfolio${
                    portfolios.length === 1 ? "" : "s"
                  } selected`}
            </p>
            <Button type="submit" size="sm" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PortfolioTile({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
        selected
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:border-primary/30",
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            selected ? "text-primary" : "text-foreground",
          )}
        >
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {selected && (
        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
      )}
    </button>
  );
}

function sortedEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.every((v, i) => v === bb[i]);
}
