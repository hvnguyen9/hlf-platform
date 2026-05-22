"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { BellPlus, Briefcase, Layers, LineChart } from "lucide-react";
import {
  QuickAddFab as QuickAddFabPrimitive,
  type QuickAddAction,
} from "@hlf/ui/quick-add-fab";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@hlf/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddStockModal } from "@/features/stocks/components/AddStockModal";
import { AddTradeModal } from "@/features/trades/components/AddTradeModal";
import { TradeAlertsManager } from "@/features/alerts/components/TradeAlertsCard";
import { LotAlertsManager } from "@/features/alerts/components/LotAlertsCard";
import type { Portfolio, StockLot } from "@/types";

/**
 * Wheel-tracker config layer over @hlf/ui's QuickAddFab primitive. Wires up
 * the portfolio picker (wheel-specific context) and the two add modals, plus
 * a contextual "Add Alert" action that surfaces when the user is on a trade
 * or stock-lot detail page.
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

function tradeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portfolios\/[^/]+\/trades\/([^/]+)/);
  return match ? match[1] : null;
}

function stockIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portfolios\/[^/]+\/stocks\/([^/]+)/);
  return match ? match[1] : null;
}

const stockFetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ stockLot: StockLot }>;

export function QuickAddFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: portfolios = [] } = usePortfolios();

  const [stockOpen, setStockOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [pid, setPid] = useState<string>("");

  // Context detection from URL.
  const activeTradeId = tradeIdFromPath(pathname);
  const activeStockId = stockIdFromPath(pathname);

  // Fetch the stock lot when on a lot detail page — LotAlertsManager needs
  // ticker + avgCost. SWR dedupes with StockDetailPageClient's identical fetch.
  const { data: stockData } = useSWR(
    activeStockId ? `/api/stocks/${activeStockId}` : null,
    stockFetcher,
  );
  const activeLot = stockData?.stockLot ?? null;

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

  const canPickPortfolio = Boolean(pid);
  const showPicker = portfolios.length > 1;

  function openModal(kind: "stock" | "trade") {
    if (!canPickPortfolio) return;
    try {
      localStorage.setItem(LAST_PORTFOLIO_KEY, pid);
    } catch {}
    if (kind === "stock") setStockOpen(true);
    else setTradeOpen(true);
  }

  // Base wheel actions.
  const actions: QuickAddAction[] = [
    {
      key: "stock",
      icon: Layers,
      label: "Add Stock Lot",
      description: "Track shares you own",
      disabled: !canPickPortfolio,
      onSelect: () => openModal("stock"),
    },
    {
      key: "trade",
      icon: LineChart,
      label: "Add Trade",
      description: "CSP, CC, or long option",
      disabled: !canPickPortfolio,
      onSelect: () => openModal("trade"),
    },
  ];

  // Contextual: only show "Add Alert" when on a trade or stock-lot detail.
  if (activeTradeId) {
    actions.push({
      key: "alert",
      icon: BellPlus,
      label: "Add Alert",
      description: "Profit / assignment / roll triggers",
      onSelect: () => setAlertOpen(true),
    });
  } else if (activeStockId && activeLot) {
    actions.push({
      key: "alert",
      icon: BellPlus,
      label: "Add Alert",
      description: `Price breach on ${activeLot.ticker}`,
      onSelect: () => setAlertOpen(true),
    });
  }

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

      {canPickPortfolio && (
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

      {/* Alert manager — contextual to the page. Modal supplies the
          shadcn-style Header/Title/Description so it matches the other Add
          modals; the manager renders just the list + add form below. */}
      {activeTradeId && (
        <ResponsiveModal open={alertOpen} onOpenChange={setAlertOpen}>
          <ResponsiveModalContent>
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>Add Alert</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Profit target, assignment risk, or roll opportunity triggers on this trade.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="mt-2">
              <TradeAlertsManager tradeId={activeTradeId} defaultAdding />
            </div>
          </ResponsiveModalContent>
        </ResponsiveModal>
      )}
      {activeStockId && activeLot && (
        <ResponsiveModal open={alertOpen} onOpenChange={setAlertOpen}>
          <ResponsiveModalContent>
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>Add Alert</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Get a toast when {activeLot.ticker} crosses a price you set.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="mt-2">
              <LotAlertsManager
                stockLotId={activeStockId}
                ticker={activeLot.ticker}
                avgCost={Number(activeLot.avgCost) || 0}
                defaultAdding
              />
            </div>
          </ResponsiveModalContent>
        </ResponsiveModal>
      )}
    </>
  );
}
