"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Portfolio { id: string; name: string }

export function SettingsContent() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selection, setSelection] = useState<"all" | Set<string>>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/portfolios"),
        fetch("/api/settings"),
      ]);
      const [pData, sData] = await Promise.all([
        pRes.json(),
        sRes.json(),
      ]) as [Portfolio[], { tradingPortfolios: string }];

      setPortfolios(pData);
      setSelection(
        sData.tradingPortfolios === "all"
          ? "all"
          : new Set(sData.tradingPortfolios.split(",").filter(Boolean))
      );
      setLoading(false);
    }
    void load();
  }, []);

  function handleSelectAll() {
    setSelection("all");
  }

  // Selecting an individual never auto-promotes to "all" — even if every
  // portfolio ends up checked. Promotion only happens via the "All" tile.
  // Deselecting the last individual falls back to "all" so we don't sit in
  // an invalid empty state.
  function togglePortfolio(id: string) {
    if (selection === "all") {
      setSelection(new Set([id]));
      return;
    }
    const next = new Set(selection);
    if (next.has(id)) {
      next.delete(id);
      setSelection(next.size === 0 ? "all" : next);
    } else {
      next.add(id);
      setSelection(next);
    }
  }

  function serializeSelection(): string {
    if (selection === "all") return "all";
    return Array.from(selection).join(",");
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradingPortfolios: serializeSelection() }),
    });
    if (res.ok) {
      toast.success("Settings saved");
      void mutate(
        (key) => typeof key === "string" && key.startsWith("/api/trading-summary"),
        undefined,
        { revalidate: true }
      );
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  const isAllSelected = selection === "all";
  const selectedCount = isAllSelected ? portfolios.length : selection.size;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your bookkeeping integrations
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Wheel Tracker — Portfolio Filter
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which portfolios feed the Trading P&amp;L auto-pull on your dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : portfolios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No portfolios found in your Wheel Tracker account.
            </p>
          ) : (
            <>
              {/* All portfolios */}
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
                  isAllSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div>
                  <p className={cn("font-medium", isAllSelected ? "text-primary" : "text-foreground")}>
                    All portfolios
                  </p>
                  <p className="text-xs text-muted-foreground">Include trades from every portfolio</p>
                </div>
                {isAllSelected && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  or select specific
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Individual portfolios — all independently checkable */}
              {portfolios.map((p) => {
                const checked = isAllSelected
                  ? false
                  : (selection as Set<string>).has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePortfolio(p.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
                      checked
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <span className={cn("font-medium", checked ? "text-primary" : "text-foreground")}>
                      {p.name}
                    </span>
                    {checked && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {isAllSelected
                    ? `All ${portfolios.length} portfolios included`
                    : `${selectedCount} of ${portfolios.length} portfolio${portfolios.length !== 1 ? "s" : ""} selected`}
                </p>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
