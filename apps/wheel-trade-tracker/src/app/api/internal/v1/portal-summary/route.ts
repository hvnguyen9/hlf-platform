import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import { db } from "@/server/db";
import { authPrisma } from "@hlf/auth-db";
import { evaluateActionableConfigsForUser } from "@/lib/alerts/engine";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// Shaped for the HLF Portal dashboard — small response, single round-trip.
// Returns:
//   - open trade/lot counts
//   - MTD/YTD realized P&L (trades + stock lots)
//   - alerts data from the alerts module (merged in 2026-05-13)
//   - actionableConfigs: configs *currently in the act zone* per the engine's
//     evaluator (not historical event fires). Powers the portal's Today inbox.
//   - expiring trades with DTE <= 7

const EXPIRING_DTE_THRESHOLD = 7;
const EXPIRING_LIMIT = 20;
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
        actionableConfigs: [],
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
      actionable,
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
        take: RECENT_ALERTS_RETURN,
        select: {
          id: true,
          message: true,
          firedAt: true,
          config: {
            select: { type: true, tradeId: true, watchlistTicker: true },
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
      // Evaluate live alert configs against current quotes — this is what
      // powers Today's action queue. Engine reuses the same evaluators the
      // every-2-min cron scan uses, but without dedup/event-write side effects.
      evaluateActionableConfigsForUser(resolvedUserId!),
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

    const actionableConfigs = actionable.map((a) => ({
      configId: a.config.id,
      type: a.config.type,
      message: a.message,
      ticker:
        a.trade?.ticker ?? a.lot?.ticker ?? a.config.watchlistTicker ?? null,
      tradeId: a.config.tradeId,
      stockLotId: a.config.stockLotId,
      watchlistTicker: a.config.watchlistTicker,
      portfolioId: a.trade?.portfolioId ?? a.lot?.portfolioId ?? null,
      price: a.price,
      dte: a.trade
        ? Math.max(
            0,
            Math.ceil(
              (a.trade.expirationDate.getTime() - todayStart.getTime()) / 86_400_000,
            ),
          )
        : null,
    }));

    return internalResponse({
      openTradeCount,
      openLotCount,
      mtdRealizedPnl,
      ytdRealizedPnl,
      alertsToday,
      alertsThisWeek,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        message: a.message,
        firedAt: a.firedAt.toISOString(),
        type: a.config.type,
        tradeId: a.config.tradeId,
        watchlistTicker: a.config.watchlistTicker,
      })),
      expiringTrades,
      actionableConfigs,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
