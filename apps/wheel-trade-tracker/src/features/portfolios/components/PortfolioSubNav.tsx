"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PortfolioSettings } from "./PortfolioSettings";
import { useTrades } from "@/features/trades/hooks/useTrades";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@/types";

const TABS = ["Overview", "Positions", "Activity", "Report"] as const;
type Tab = (typeof TABS)[number];

function resolveActiveTab(pathname: string, tabParam: string | null): Tab {
  // Trade/stock detail pages live conceptually under Positions
  if (/\/(trades|stocks)\//.test(pathname)) return "Positions";
  const candidate = tabParam as Tab;
  return TABS.includes(candidate) ? candidate : "Overview";
}

export default function PortfolioSubNav({
  portfolioId,
  portfolio,
}: {
  portfolioId: string;
  portfolio: Portfolio | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { trades: openTrades } = useTrades(portfolioId, "open");

  const activeTab = resolveActiveTab(pathname, searchParams.get("tab"));

  function handleTabClick(tab: Tab) {
    router.push(`/portfolios/${portfolioId}?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="sticky top-0 z-30 px-4 sm:px-6 py-2 bg-muted/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-muted/70 dark:supports-[backdrop-filter]:bg-gray-950/70 border-b border-border/40">
      <div className="flex items-center justify-between gap-2">

        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Link
              href="/summary"
              className="hover:text-foreground transition-colors shrink-0"
            >
              All Accounts
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />
            <Link
              href={`/portfolios/${portfolioId}`}
              className="hover:text-foreground transition-colors truncate"
            >
              {portfolio?.name ?? "Portfolio"}
            </Link>
          </div>

          {/* Tab pills */}
          <div className="flex gap-1 bg-background/80 dark:bg-background/60 p-1 rounded-lg w-fit overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
                {tab === "Positions" && openTrades.length > 0 && (
                  <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                    {openTrades.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Settings gear — always accessible regardless of which sub-page you're on */}
        {portfolio && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                title="Portfolio settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col overflow-hidden w-full sm:max-w-[480px]">
              <SheetHeader className="pb-2 shrink-0">
                <SheetTitle>Portfolio Settings</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <PortfolioSettings portfolio={portfolio} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
