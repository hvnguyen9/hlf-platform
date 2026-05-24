// Pure helper that turns wheel-tracker's portal-summary into a list of
// action items for the Today inbox. Wheel is the only contributor — budget
// and bookkeeping rows were dropped because they couldn't produce signal
// that changed day-to-day (recurring entries showed the same items every
// render).
//
// Action items come from two sources:
//   1. actionableConfigs — alert configs whose threshold is *currently*
//      satisfied per the engine's evaluator. Live state, not historical
//      fires. Powers the "Action alerts" section.
//   2. expiringTrades — open trades with DTE <= 7. Powers the "Expiring
//      this week" section.

import type {
  ActionableConfig,
  ExpiringTrade,
  WheelSummary,
} from "@/lib/clients/types";

export type TodaySeverity = "high" | "medium" | "low";

export type TodayItemKind = "ALERT" | "EXPIRING";

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
    for (const ac of args.wheel.actionableConfigs ?? []) {
      items.push(actionableToItem(ac, args.appUrls.wheel));
    }
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

function actionableToItem(ac: ActionableConfig, wheelUrl: string): TodayItem {
  const ticker = ac.ticker ?? extractTicker(ac.message) ?? undefined;
  const title = ticker
    ? `${ticker} · ${formatAlertType(ac.type)}`
    : formatAlertType(ac.type);

  // URL routing: trade-bound configs deep-link to the trade detail page;
  // lot-bound to the lot detail page; watchlist-bound and orphans land on
  // the alerts list page.
  let actionUrl = `${wheelUrl}/alerts`;
  let actionLabel = "Open alerts";
  if (ac.tradeId && ac.portfolioId) {
    actionUrl = `${wheelUrl}/portfolios/${ac.portfolioId}/trades/${ac.tradeId}`;
    actionLabel = "Open trade";
  } else if (ac.stockLotId && ac.portfolioId) {
    actionUrl = `${wheelUrl}/portfolios/${ac.portfolioId}/stocks/${ac.stockLotId}`;
    actionLabel = "Open lot";
  } else if (ac.watchlistTicker) {
    actionUrl = `${wheelUrl}/watchlist`;
    actionLabel = "Open watchlist";
  }

  return {
    id: `actionable:${ac.configId}`,
    kind: "ALERT",
    severity: severityFor(ac),
    title,
    description: ac.message,
    actionLabel,
    actionUrl,
    ticker,
  };
}

function severityFor(ac: ActionableConfig): TodaySeverity {
  // Trade-bound: getting closer to expiration ratchets severity up. ITM
  // assignment-risk fires regardless of DTE, but if it does fire at DTE<=2
  // it's a high-priority decision.
  if (ac.type === "ASSIGNMENT_RISK") {
    return ac.dte !== null && ac.dte <= 2 ? "high" : "medium";
  }
  if (ac.type === "ROLL_OPPORTUNITY") {
    return ac.dte !== null && ac.dte <= 2 ? "high" : "medium";
  }
  if (ac.type === "PROFIT_TARGET") {
    // Profit targets that fired are always at least the user's threshold —
    // we don't know the exact pct without parsing the message. Default
    // medium, but a same-day expiry profit hit is "do it now."
    return ac.dte !== null && ac.dte <= 1 ? "high" : "medium";
  }
  // WATCHLIST_BREACH / LOT_PRICE_BREACH: time-insensitive triggers.
  return "medium";
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

function formatAlertType(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTradeType(type: string) {
  // CashSecuredPut → CSP, CoveredCall → CC, Put / Call unchanged
  if (type === "CashSecuredPut") return "CSP";
  if (type === "CoveredCall") return "CC";
  return type;
}

// Alert messages produced by the engine usually start with a ticker. Pull it
// out for the card heading when we don't have an explicit ticker on the
// payload. Returns null if no obvious symbol is found.
function extractTicker(message: string): string | null {
  const match = message.match(/\b[A-Z]{1,5}\b/);
  return match ? match[0] : null;
}
