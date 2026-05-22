"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Plus, Briefcase, Layers, LineChart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const LAST_PORTFOLIO_KEY = "wheeltracker.quickadd.lastPortfolio";

function usePortfolios() {
  const { data: session } = useSession();
  return useSWR<Portfolio[]>(session?.user?.id ? "/api/portfolios" : null);
}

/** Pull the portfolioId out of the URL when we're on a portfolio-scoped route. */
function portfolioIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/portfolios\/([^/]+)/);
  return match ? match[1] : null;
}

// ───────────────────────── Mobile sheet (big tap targets) ─────────────────

function MobileQuickAddSheet({
  open,
  onOpenChange,
  portfolios,
  initialPortfolioId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolios: Portfolio[];
  initialPortfolioId: string | null;
  onPick: (kind: "stock" | "trade", portfolioId: string) => void;
}) {
  const [pid, setPid] = useState<string>(initialPortfolioId ?? portfolios[0]?.id ?? "");

  useEffect(() => {
    if (open) setPid(initialPortfolioId ?? portfolios[0]?.id ?? "");
  }, [open, initialPortfolioId, portfolios]);

  const canPick = Boolean(pid);
  const showPicker = portfolios.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base">Quick Add</SheetTitle>
          <SheetDescription>
            {portfolios.length === 0
              ? "Create a portfolio first to add stocks or trades."
              : "Add a stock lot or option trade to a portfolio."}
          </SheetDescription>
        </SheetHeader>

        {portfolios.length > 0 && (
          <div className="space-y-4 pt-2">
            {showPicker ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Portfolio
                </label>
                <Select value={pid} onValueChange={setPid}>
                  <SelectTrigger className="h-10">
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
              <p className="text-xs text-muted-foreground">
                <Briefcase className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                {portfolios[0]?.name || "Unnamed Portfolio"}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canPick}
                onClick={() => canPick && onPick("stock", pid)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-5 transition-colors",
                  canPick
                    ? "hover:bg-accent active:scale-[0.98]"
                    : "opacity-50 cursor-not-allowed",
                )}
              >
                <Layers className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sm">Add Stock Lot</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  Track shares you own
                </span>
              </button>
              <button
                type="button"
                disabled={!canPick}
                onClick={() => canPick && onPick("trade", pid)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-5 transition-colors",
                  canPick
                    ? "hover:bg-accent active:scale-[0.98]"
                    : "opacity-50 cursor-not-allowed",
                )}
              >
                <LineChart className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sm">Add Trade</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  CSP, CC, or long option
                </span>
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ───────────────────────── Desktop popover (compact rows) ─────────────────

function DesktopQuickAddPopover({
  open,
  onOpenChange,
  portfolios,
  initialPortfolioId,
  onPick,
  anchor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolios: Portfolio[];
  initialPortfolioId: string | null;
  onPick: (kind: "stock" | "trade", portfolioId: string) => void;
  anchor: React.ReactNode;
}) {
  const [pid, setPid] = useState<string>(initialPortfolioId ?? portfolios[0]?.id ?? "");

  useEffect(() => {
    if (open) setPid(initialPortfolioId ?? portfolios[0]?.id ?? "");
  }, [open, initialPortfolioId, portfolios]);

  const canPick = Boolean(pid);
  const showPicker = portfolios.length > 1;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{anchor}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-72 p-0"
      >
        <div className="px-3 py-2 border-b">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Add
          </p>
        </div>

        {portfolios.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Create a portfolio first to add stocks or trades.
          </p>
        ) : (
          <>
            {showPicker && (
              <div className="px-3 py-2 border-b">
                <Select value={pid} onValueChange={setPid}>
                  <SelectTrigger className="h-8 text-xs">
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
            )}
            {!showPicker && portfolios[0] && (
              <div className="px-3 py-1.5 border-b flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                {portfolios[0].name || "Unnamed Portfolio"}
              </div>
            )}

            <div className="p-1">
              <button
                type="button"
                disabled={!canPick}
                onClick={() => canPick && onPick("stock", pid)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  canPick
                    ? "hover:bg-accent text-foreground"
                    : "opacity-50 cursor-not-allowed text-muted-foreground",
                )}
              >
                <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-left">
                  <span className="block font-medium">Add Stock Lot</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Track shares you own
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              </button>
              <button
                type="button"
                disabled={!canPick}
                onClick={() => canPick && onPick("trade", pid)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  canPick
                    ? "hover:bg-accent text-foreground"
                    : "opacity-50 cursor-not-allowed text-muted-foreground",
                )}
              >
                <LineChart className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-left">
                  <span className="block font-medium">Add Trade</span>
                  <span className="block text-[11px] text-muted-foreground">
                    CSP, CC, or long option
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ───────────────────────── Root: FABs + modal mounts ──────────────────────

export function QuickAddFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { data: portfolios = [] } = usePortfolios();

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [desktopPopoverOpen, setDesktopPopoverOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [activePid, setActivePid] = useState<string | null>(null);

  // Hide on auth pages — match AppShell's hideChrome logic.
  const hideOn = ["/", "/login", "/signup"];
  if (!session || hideOn.includes(pathname)) return null;

  // Default portfolio = URL-scoped, then last-used from localStorage, then first.
  const initialPortfolioId = (() => {
    const fromUrl = portfolioIdFromPath(pathname);
    if (fromUrl && portfolios.some((p) => p.id === fromUrl)) return fromUrl;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LAST_PORTFOLIO_KEY);
      if (stored && portfolios.some((p) => p.id === stored)) return stored;
    }
    return portfolios[0]?.id ?? null;
  })();

  function handlePick(kind: "stock" | "trade", portfolioId: string) {
    try {
      localStorage.setItem(LAST_PORTFOLIO_KEY, portfolioId);
    } catch {}
    setActivePid(portfolioId);
    setMobileSheetOpen(false);
    setDesktopPopoverOpen(false);
    if (kind === "stock") setStockOpen(true);
    else setTradeOpen(true);
  }

  // FAB button skin — no display utility here; each surface picks its own
  // (otherwise `flex` in this base would collide with `hidden` on the
  // opposite-viewport FAB and Tailwind's CSS-order rules would make it leak
  // across breakpoints).
  const fabBase =
    "rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl items-center justify-center transition-all active:scale-95";

  return (
    <>
      {/* Mobile FAB — opens bottom sheet */}
      <button
        type="button"
        aria-label="Quick add"
        onClick={() => setMobileSheetOpen(true)}
        className={cn(
          "flex md:hidden fixed right-4 z-40 h-14 w-14",
          // Sits above the bottom nav (h-14) + safe-area inset.
          "bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom))]",
          fabBase,
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Desktop FAB — opens compact popover anchored to itself */}
      <DesktopQuickAddPopover
        open={desktopPopoverOpen}
        onOpenChange={setDesktopPopoverOpen}
        portfolios={portfolios}
        initialPortfolioId={initialPortfolioId}
        onPick={handlePick}
        anchor={
          <button
            type="button"
            aria-label="Quick add"
            className={cn(
              "hidden md:flex fixed bottom-6 right-6 z-40 h-12 w-12",
              fabBase,
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        }
      />

      <MobileQuickAddSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        portfolios={portfolios}
        initialPortfolioId={initialPortfolioId}
        onPick={handlePick}
      />

      {activePid && (
        <>
          <AddStockModal
            portfolioId={activePid}
            open={stockOpen}
            onOpenChange={setStockOpen}
          />
          <AddTradeModal
            portfolioId={activePid}
            open={tradeOpen}
            onOpenChange={setTradeOpen}
          />
        </>
      )}
    </>
  );
}
