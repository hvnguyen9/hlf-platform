import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import { db } from "@/server/db";
import { authPrisma } from "@hlf/auth-db";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// Shaped for the HLF Portal dashboard — small response, single round-trip.
// Returns: open trade/lot counts, MTD/YTD realized P&L (trades + stock lots),
// alerts data (sourced from the alerts module merged in 2026-05-13), and
// open trades with DTE <= 7 (consumed by portal's Today inbox).

const EXPIRING_DTE_THRESHOLD = 7;
const EXPIRING_LIMIT = 20;
// We fetch a larger pool of recent alerts than we return, then filter out
// ones linked to closed trades / removed watchlist items so the portal's
// Today inbox only surfaces still-actionable items. Returned count is
// RECENT_ALERTS_RETURN.
const RECENT_ALERTS_POOL = 40;
const RECENT_ALERTS_RETURN = 10;
export async function GET(request: Request) {
  if (!validateInternalApiKey(request)) {
    return internalError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  // Optional CSV of portfolio IDs to scope realized P&L + expiring trades to.
  // Open-position counts and alerts are NOT scoped — those reflect the full
  // account regardless of which portfolios the user wants in their rollups.
  const portfolioIdsParam = searchParams.get("portfolioIds");
  const portfolioIds = portfolioIdsParam
    ? portfolioIdsParam.split(",").filter(Boolean)
    : undefined;

  if (!userId && !email) {
    return internalError("userId or email is required", 400);
  }

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const user = await authPrisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return internalResponse({
        openTradeCount: 0,
        openLotCount: 0,
        mtdRealizedPnl: 0,
        ytdRealizedPnl: 0,
        alertsToday: 0,
        alertsThisWeek: 0,
        recentAlerts: [],
        expiringTrades: [],
      });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const expiringCutoff = new Date(todayStart);
  expiringCutoff.setDate(expiringCutoff.getDate() + EXPIRING_DTE_THRESHOLD + 1);

  const portfolioFilter = {
    userId: resolvedUserId!,
    ...(portfolioIds && { id: { in: portfolioIds } }),
  };
  // Open positions count + expiring trades reflect the full account so the
  // user still sees what they actually have. Realized P&L respects the filter.
  const portfolioFilterAll = { userId: resolvedUserId! };

  try {
    const [
      openTradeCount,
      openLotCount,
      ytdTrades,
      ytdLots,
      alertsToday,
      alertsThisWeek,
      recentAlerts,
      expiringTradeRows,
    ] = await Promise.all([
      db.trade.count({
        where: { status: "open", portfolio: portfolioFilterAll },
      }),
      db.stockLot.count({
        where: { status: "OPEN", portfolio: portfolioFilterAll },
      }),
      db.trade.findMany({
        where: {
          status: "closed",
          portfolio: portfolioFilter,
          closedAt: { gte: ytdStart },
        },
        select: { closedAt: true, premiumCaptured: true },
      }),
      db.stockLot.findMany({
        where: {
          status: "CLOSED",
          portfolio: portfolioFilter,
          closedAt: { gte: ytdStart },
        },
        select: { closedAt: true, realizedPnl: true },
      }),
      db.alertEvent.count({
        where: { userId: resolvedUserId!, firedAt: { gte: todayStart } },
      }),
      db.alertEvent.count({
        where: { userId: resolvedUserId!, firedAt: { gte: weekStart } },
      }),
      db.alertEvent.findMany({
        where: { userId: resolvedUserId! },
        orderBy: { firedAt: "desc" },
        take: RECENT_ALERTS_POOL,
        select: {
          id: true,
          message: true,
          firedAt: true,
          config: {
            select: {
              type: true,
              tradeId: true,
              watchlistTicker: true,
              stockLotId: true,
            },
          },
        },
      }),
      db.trade.findMany({
        where: {
          status: "open",
          portfolio: portfolioFilterAll,
          expirationDate: { lt: expiringCutoff },
        },
        orderBy: { expirationDate: "asc" },
        take: EXPIRING_LIMIT,
        select: {
          id: true,
          ticker: true,
          type: true,
          strikePrice: true,
          contracts: true,
          expirationDate: true,
          portfolioId: true,
        },
      }),
    ]);

    let mtdRealizedPnl = 0;
    let ytdRealizedPnl = 0;

    for (const t of ytdTrades) {
      const pnl = t.premiumCaptured ?? 0;
      ytdRealizedPnl += pnl;
      if (t.closedAt && t.closedAt >= mtdStart) mtdRealizedPnl += pnl;
    }

    for (const lot of ytdLots) {
      const pnl = Number(lot.realizedPnl ?? 0);
      ytdRealizedPnl += pnl;
      if (lot.closedAt && lot.closedAt >= mtdStart) mtdRealizedPnl += pnl;
    }

    const expiringTrades = expiringTradeRows.map((t) => {
      const dteMs = t.expirationDate.getTime() - todayStart.getTime();
      const dte = Math.max(0, Math.ceil(dteMs / 86_400_000));
      return {
        id: t.id,
        ticker: t.ticker,
        type: t.type,
        strikePrice: t.strikePrice,
        contracts: t.contracts,
        expirationDate: t.expirationDate.toISOString(),
        portfolioId: t.portfolioId,
        dte,
      };
    });

    // Trim recent alerts to those that are still actionable — drop ones
    // linked to closed trades / closed stock lots. Watchlist-bound configs
    // and configs with no link are always kept.
    const tradeIdsInAlerts = Array.from(
      new Set(
        recentAlerts
          .map((a) => a.config.tradeId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const lotIdsInAlerts = Array.from(
      new Set(
        recentAlerts
          .map((a) => a.config.stockLotId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const [openTradeRows, openLotRows] = await Promise.all([
      tradeIdsInAlerts.length
        ? db.trade.findMany({
            where: { id: { in: tradeIdsInAlerts }, status: "open" },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
      lotIdsInAlerts.length
        ? db.stockLot.findMany({
            where: { id: { in: lotIdsInAlerts }, status: "OPEN" },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
    ]);
    const openTradeIdSet = new Set(openTradeRows.map((r) => r.id));
    const openLotIdSet = new Set(openLotRows.map((r) => r.id));
    const activeRecentAlerts = recentAlerts
      .filter((a) => {
        const { tradeId, stockLotId } = a.config;
        if (tradeId) return openTradeIdSet.has(tradeId);
        if (stockLotId) return openLotIdSet.has(stockLotId);
        return true;
      })
      .slice(0, RECENT_ALERTS_RETURN);

    return internalResponse({
      openTradeCount,
      openLotCount,
      mtdRealizedPnl,
      ytdRealizedPnl,
      alertsToday,
      alertsThisWeek,
      recentAlerts: activeRecentAlerts.map((a) => ({
        id: a.id,
        message: a.message,
        firedAt: a.firedAt.toISOString(),
        type: a.config.type,
        tradeId: a.config.tradeId,
        watchlistTicker: a.config.watchlistTicker,
      })),
      expiringTrades,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
