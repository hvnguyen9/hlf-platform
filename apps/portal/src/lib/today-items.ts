// Pure helper that turns wheel-tracker's portal-summary into a list of
// action items for the Today inbox. Wheel is the only contributor — budget
// and bookkeeping rows were dropped because they couldn't produce signal
// that changed day-to-day (recurring entries showed the same items every
// render).
//
// Action items come from open trades with DTE <= 7 — the "Expiring this
// week" section. (The realtime alerts module that previously fed an
// "Action alerts" section was retired 2026-06-29.)

import type { ExpiringTrade, WheelSummary } from "@/lib/clients/types";

export type TodaySeverity = "high" | "medium" | "low";

export type TodayItemKind = "EXPIRING";

export type TodayItem = {
  id: string;
  kind: TodayItemKind;
  severity: TodaySeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  ticker?: string;
  timestamp?: string;
};

type AppUrls = {
  wheel: string;
};

const SEVERITY_RANK: Record<TodaySeverity, number> = { high: 0, medium: 1, low: 2 };

export function buildTodayItems(args: {
  wheel: WheelSummary | null;
  appUrls: AppUrls;
  now?: Date;
}): TodayItem[] {
  const items: TodayItem[] = [];

  if (args.wheel) {
    for (const trade of args.wheel.expiringTrades ?? []) {
      items.push(expiringTradeToItem(trade, args.appUrls.wheel));
    }
  }

  items.sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    const aTs = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTs = b.timestamp ? Date.parse(b.timestamp) : 0;
    return bTs - aTs;
  });

  return items;
}

function expiringTradeToItem(trade: ExpiringTrade, wheelUrl: string): TodayItem {
  const severity: TodaySeverity = trade.dte <= 2 ? "high" : "medium";
  const human = formatTradeType(trade.type);
  const strike = `$${trade.strikePrice}`;
  const dteLabel =
    trade.dte === 0 ? "expires today" : trade.dte === 1 ? "1 day to expiry" : `${trade.dte} days to expiry`;
  return {
    id: `expiring:${trade.id}`,
    kind: "EXPIRING",
    severity,
    title: `${trade.ticker} ${human} ${strike} · ${dteLabel}`,
    description: `${trade.contracts} contract${trade.contracts === 1 ? "" : "s"} — decide whether to close, roll, or let expire.`,
    actionLabel: "Open trade",
    actionUrl: `${wheelUrl}/portfolios/${trade.portfolioId}/trades/${trade.id}`,
    ticker: trade.ticker,
    timestamp: trade.expirationDate,
  };
}

function formatTradeType(type: string) {
  // CashSecuredPut → CSP, CoveredCall → CC, Put / Call unchanged
  if (type === "CashSecuredPut") return "CSP";
  if (type === "CoveredCall") return "CC";
  return type;
}
