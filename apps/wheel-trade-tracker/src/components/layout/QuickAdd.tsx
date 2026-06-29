"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Briefcase,
  LayersIcon,
  LineChart,
  Plus,
  Shield,
  TrendingDown,
  TrendingUp,
  MoreHorizontal,
  XCircle,
  Layers,
} from "lucide-react";
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
import type { Portfolio, StockLot, Trade } from "@/types";

/**
 * Wheel-tracker config layer over @hlf/ui's QuickAddFab primitive.
 *
 * On list/summary pages the FAB shows the standard "+" and lets the user add
 * a stock lot or option trade.
 *
 * On trade detail pages the FAB becomes a contextual "⚡" action hub:
 *   - Add to Position
 *   - Close Position (destructive)
 *
 * On stock-lot detail pages the FAB shows:
 *   - Add Shares
 *   - Sell Covered Call
 *   - Sell Shares (destructive)
 *
 * Close/add modals remain in TradeDetailPageClient / StockDetailPageClient so
 * their mutate callbacks stay wired. The FAB opens them via CustomEvents.
 */

const LAST_PORTFOLIO_KEY = "wheeltracker.quickadd.lastPortfolio";

const genericFetcher = <T,>(url: string) =>
  fetch(url).then((r) => r.json()) as Promise<T>;

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

export function QuickAddFab() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const pathname = usePathname();
  const { data: portfolios = [] } = usePortfolios();

  const [stockOpen, setStockOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [sellCCOpen, setSellCCOpen] = useState(false);
  const [pid, setPid] = useState<string>("");

  // Context detection from URL
  const activeTradeId = tradeIdFromPath(pathname);
  const activeStockId = stockIdFromPath(pathname);

  // Fetch trade when on a trade detail page — SWR dedupes with TradeDetailPageClient
  const { data: tradeData } = useSWR<Trade>(
    activeTradeId ? `/api/trades/${activeTradeId}` : null,
    genericFetcher,
  );
  const activeTrade =
    tradeData && tradeData.status === "open" ? tradeData : null;

  // Fetch stock lot when on a lot detail page — SWR dedupes with StockDetailPageClient
  const { data: stockData } = useSWR<{ stockLot: StockLot }>(
    activeStockId ? `/api/stocks/${activeStockId}` : null,
    genericFetcher,
  );
  const activeLot =
    stockData?.stockLot &&
    String(stockData.stockLot.status).toUpperCase() !== "CLOSED"
      ? stockData.stockLot
      : null;

  // Re-seed pid whenever the resolved default changes
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

  // Hide on auth pages
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

  const isTradeDetail = Boolean(activeTrade);
  const isStockDetail = Boolean(activeLot);
  const isDetailPage = isTradeDetail || isStockDetail;

  // Build actions based on context
  let actions: QuickAddAction[] = [];

  if (isTradeDetail && activeTrade) {
    actions = [
      {
        key: "add-to-position",
        icon: TrendingUp,
        label: "Add to Position",
        description: "Buy more contracts",
        onSelect: () => window.dispatchEvent(new CustomEvent("trade:open-add")),
      },
      {
        key: "close-position",
        icon: XCircle,
        label: "Close Position",
        description: "Expire, assign, or manual close",
        variant: "destructive",
        divider: true,
        onSelect: () => window.dispatchEvent(new CustomEvent("trade:open-close")),
      },
      ...(isAdmin
        ? [
            {
              key: "admin-edit",
              icon: Shield,
              label: "Admin Edit",
              description: "Override trade fields",
              divider: true,
              onSelect: () => window.dispatchEvent(new CustomEvent("trade:open-admin")),
            } satisfies QuickAddAction,
          ]
        : []),
    ];
  } else if (isStockDetail && activeLot) {
    const contractsAvailable = Math.floor(activeLot.shares / 100);
    actions = [
      {
        key: "add-shares",
        icon: LayersIcon,
        label: "Add Shares",
        description: "Increase position size",
        onSelect: () => window.dispatchEvent(new CustomEvent("stock:open-add")),
      },
      ...(contractsAvailable >= 1
        ? [
            {
              key: "sell-cc",
              icon: LineChart,
              label: "Sell Covered Call",
              description: `${contractsAvailable} contract${contractsAvailable !== 1 ? "s" : ""} available`,
              onSelect: () => setSellCCOpen(true),
            } satisfies QuickAddAction,
          ]
        : []),
      {
        key: "sell-shares",
        icon: TrendingDown,
        label: "Sell Shares",
        description: "Partial or full exit",
        variant: "destructive",
        divider: true,
        onSelect: () => window.dispatchEvent(new CustomEvent("stock:open-close")),
      },
      ...(isAdmin
        ? [
            {
              key: "admin-edit",
              icon: Shield,
              label: "Admin Edit",
              description: "Override lot fields",
              divider: true,
              onSelect: () => window.dispatchEvent(new CustomEvent("stock:open-admin")),
            } satisfies QuickAddAction,
          ]
        : []),
    ];
  } else {
    // List / summary pages — standard add actions
    actions = [
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
  }

  // Portfolio picker header — not shown on detail pages
  const header =
    portfolios.length === 0 || isDetailPage
      ? null
      : showPicker
        ? (
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
          )
        : (
            <div className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              {portfolios[0]?.name || "Unnamed Portfolio"}
            </div>
          );

  const fabTitle = isDetailPage ? "Actions" : "Quick Add";
  const fabIcon = isDetailPage ? MoreHorizontal : Plus;
  const fabAriaLabel = isDetailPage ? "Position actions" : "Quick add";

  return (
    <>
      <QuickAddFabPrimitive
        hidden={hidden}
        actions={portfolios.length === 0 && !isDetailPage ? [] : actions}
        header={header}
        title={fabTitle}
        fabIcon={fabIcon}
        ariaLabel={fabAriaLabel}
        description={
          portfolios.length === 0 && !isDetailPage
            ? "Create a portfolio first to add stocks or trades."
            : undefined
        }
        emptyState={
          <p>Create a portfolio first to add stocks or trades.</p>
        }
      />

      {/* Standard add modals — list/summary pages */}
      {canPickPortfolio && !isDetailPage && (
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

      {/* Sell CC modal — stock detail context, prefilled with ticker */}
      {activeLot && (
        <AddTradeModal
          portfolioId={activeLot.portfolioId}
          open={sellCCOpen}
          onOpenChange={setSellCCOpen}
          prefill={{
            ticker: activeLot.ticker,
            type: "CoveredCall",
            stockLotId: activeLot.id,
          }}
        />
      )}
    </>
  );
}
