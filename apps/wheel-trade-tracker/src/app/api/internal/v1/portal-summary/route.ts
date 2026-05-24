import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import { db } from "@/server/db";
import { authPrisma } from "@hlf/auth-db";
import { evaluateActionableConfigsForUser } from "@/lib/alerts/engine";
import { getQuoteSnapshots } from "@/lib/alpaca";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// Shaped for the HLF Portal dashboard — small response, single round-trip.
// Returns:
//   - open trade/lot counts
//   - MTD/YTD realized P&L (trades + stock lots)
//   - alerts data from the alerts module (merged in 2026-05-13)
//   - actionableConfigs: configs *currently in the act zone* per the engine's
//     evaluator (not historical event fires). Powers the portal's Today inbox.
//   - expiring trades with DTE <= 7
//   - openTrades + openLots: position snapshots with current quotes for the
//     portal Dashboard's morning briefing surface (Phase 2).

const EXPIRING_DTE_THRESHOLD = 7;
const EXPIRING_LIMIT = 20;
const RECENT_ALERTS_RETURN = 10;
// Cap snapshot tables — Dashboard shows compact previews, full list in
// wheel-tracker. Sorted by ascending DTE (trades) / descending notional (lots)
// so the most attention-worthy items lead.
const OPEN_TRADES_LIMIT = 8;
const OPEN_LOTS_LIMIT = 8;
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
        openTrades: [],
        openLots: [],
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
      openTradeRows,
      openLotRows,
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
      // Position snapshots for the Dashboard. Trades sorted by ascending DTE
      // so the most time-sensitive show first. Lots sorted by notional
      // (avgCost * shares) descending so the biggest exposures lead.
      db.trade.findMany({
        where: { status: "open", portfolio: portfolioFilterAll },
        orderBy: { expirationDate: "asc" },
        take: OPEN_TRADES_LIMIT,
        select: {
          id: true,
          ticker: true,
          type: true,
          strikePrice: true,
          contracts: true,
          contractsOpen: true,
          contractPrice: true,
          expirationDate: true,
          portfolioId: true,
        },
      }),
      db.stockLot.findMany({
        where: { status: "OPEN", portfolio: portfolioFilterAll },
        orderBy: { shares: "desc" },
        take: OPEN_LOTS_LIMIT,
        select: {
          id: true,
          ticker: true,
          shares: true,
          avgCost: true,
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

    // One quote-snapshot batch covers every ticker we need to enrich. Sums
    // open-trade tickers + open-lot tickers; getQuoteSnapshots dedupes inside.
    const snapshotTickers = Array.from(
      new Set([
        ...openTradeRows.map((t) => t.ticker.toUpperCase()),
        ...openLotRows.map((l) => l.ticker.toUpperCase()),
      ]),
    );
    const snapshotMap = new Map<string, { price: number | null; changePct: number | null; previousClose: number | null }>();
    if (snapshotTickers.length) {
      try {
        const snaps = await getQuoteSnapshots(snapshotTickers);
        for (const s of snaps) {
          snapshotMap.set(s.ticker, {
            price: s.price,
            changePct: s.changePct,
            previousClose: s.previousClose,
          });
        }
      } catch (err) {
        // Snapshots are best-effort — log and continue with null prices so
        // the rest of the payload still renders.
        console.error("[internal/portal-summary] snapshot fetch failed:", err);
      }
    }

    const openTrades = openTradeRows.map((t) => {
      const snap = snapshotMap.get(t.ticker.toUpperCase());
      const dteMs = t.expirationDate.getTime() - todayStart.getTime();
      const dte = Math.max(0, Math.ceil(dteMs / 86_400_000));
      // ITM status: short put is ITM when price < strike; short call when
      // price > strike. For the snapshot we don't distinguish trade direction
      // (we don't model long options separately in the wheel context), so
      // treat puts and calls by their type label.
      const price = snap?.price ?? null;
      const isPutLike = t.type === "CashSecuredPut" || t.type === "Put";
      const itm =
        price !== null
          ? isPutLike
            ? price < t.strikePrice
            : price > t.strikePrice
          : null;
      return {
        id: t.id,
        ticker: t.ticker,
        type: t.type,
        strikePrice: t.strikePrice,
        contracts: t.contractsOpen ?? t.contracts,
        expirationDate: t.expirationDate.toISOString(),
        portfolioId: t.portfolioId,
        dte,
        currentPrice: price,
        changePct: snap?.changePct ?? null,
        itm,
      };
    });

    const openLots = openLotRows.map((l) => {
      const snap = snapshotMap.get(l.ticker.toUpperCase());
      const avgCost = Number(l.avgCost);
      const price = snap?.price ?? null;
      const unrealizedPnl =
        price !== null && Number.isFinite(avgCost)
          ? (price - avgCost) * l.shares
          : null;
      const unrealizedPct =
        unrealizedPnl !== null && avgCost > 0 ? ((price! - avgCost) / avgCost) * 100 : null;
      return {
        id: l.id,
        ticker: l.ticker,
        shares: l.shares,
        avgCost,
        portfolioId: l.portfolioId,
        currentPrice: price,
        changePct: snap?.changePct ?? null,
        unrealizedPnl,
        unrealizedPct,
      };
    });

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
      openTrades,
      openLots,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
