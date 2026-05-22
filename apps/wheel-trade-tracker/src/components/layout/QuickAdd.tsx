"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Briefcase, Layers, LineChart } from "lucide-react";
import {
  QuickAddFab as QuickAddFabPrimitive,
  type QuickAddAction,
} from "@hlf/ui/quick-add-fab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddStockModal } from "@/features/stocks/components/AddStockModal";
import { AddTradeModal } from "@/features/trades/components/AddTradeModal";
import type { Portfolio } from "@/types";

/**
 * Wheel-tracker config layer over @hlf/ui's QuickAddFab primitive. Wires up
 * the portfolio picker (wheel-specific context) and the two add modals.
 */

const LAST_PORTFOLIO_KEY = "wheeltracker.quickadd.lastPortfolio";

function usePortfolios() {
  const { data: session } = useSession();
  return useSWR<Portfolio[]>(session?.user?.id ? "/api/portfolios" : null);
}

function portfolioIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portfolios\/([^/]+)/);
  return match ? match[1] : null;
}

export function QuickAddFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: portfolios = [] } = usePortfolios();

  const [stockOpen, setStockOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [pid, setPid] = useState<string>("");

  // Re-seed pid whenever the resolved default changes.
  const defaultPid = (() => {
    const fromUrl = portfolioIdFromPath(pathname);
    if (fromUrl && portfolios.some((p) => p.id === fromUrl)) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LAST_PORTFOLIO_KEY);
      if (stored && portfolios.some((p) => p.id === stored)) return stored;
    }
    return portfolios[0]?.id ?? "";
  })();
  useEffect(() => {
    setPid(defaultPid);
  }, [defaultPid]);

  // Hide on auth pages (mirrors AppShell's hideChrome logic).
  const hideOn = ["/", "/login", "/signup"];
  const hidden = !session || hideOn.includes(pathname);

  const canPick = Boolean(pid);
  const showPicker = portfolios.length > 1;

  function openModal(kind: "stock" | "trade") {
    if (!canPick) return;
    try {
      localStorage.setItem(LAST_PORTFOLIO_KEY, pid);
    } catch {}
    if (kind === "stock") setStockOpen(true);
    else setTradeOpen(true);
  }

  // Wheel-specific actions.
  const actions: QuickAddAction[] = [
    {
      key: "stock",
      icon: Layers,
      label: "Add Stock Lot",
      description: "Track shares you own",
      disabled: !canPick,
      onSelect: () => openModal("stock"),
    },
    {
      key: "trade",
      icon: LineChart,
      label: "Add Trade",
      description: "CSP, CC, or long option",
      disabled: !canPick,
      onSelect: () => openModal("trade"),
    },
  ];

  // Header content — portfolio picker for multi-portfolio users, static label
  // for single-portfolio users. Empty when no portfolios exist.
  const header =
    portfolios.length === 0
      ? null
      : showPicker ? (
          <div className="px-3 py-2">
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pick a portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.name || "Unnamed Portfolio"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            {portfolios[0]?.name || "Unnamed Portfolio"}
          </div>
        );

  return (
    <>
      <QuickAddFabPrimitive
        hidden={hidden}
        actions={portfolios.length === 0 ? [] : actions}
        header={header}
        title="Quick Add"
        description={
          portfolios.length === 0
            ? "Create a portfolio first to add stocks or trades."
            : "Add a stock lot or option trade to a portfolio."
        }
        emptyState={
          <p>Create a portfolio first to add stocks or trades.</p>
        }
      />

      {canPick && (
        <>
          <AddStockModal
            portfolioId={pid}
            open={stockOpen}
            onOpenChange={setStockOpen}
          />
          <AddTradeModal
            portfolioId={pid}
            open={tradeOpen}
            onOpenChange={setTradeOpen}
          />
        </>
      )}
    </>
  );
}
