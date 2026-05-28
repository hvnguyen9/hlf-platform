import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import { db } from "@/server/db";
import { authPrisma } from "@hlf/auth-db";
import { evaluateActionableConfigsForUser } from "@/lib/alerts/engine";
import { getQuoteSnapshots } from "@/lib/alpaca";
import { getCalendarEvents } from "@/lib/yahoo-finance";
import { capitalUsedForTrade } from "@/lib/tradeMetrics";
import { loadEffectiveBasisByLot } from "@/lib/effectiveStockBasis";

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
//   - upcomingEvents: chronological 7-day lookahead combining option expiries
//     with earnings dates and ex-dividend dates for open-position tickers
//     (Phase 3). Calendar data is best-effort via Yahoo's quoteSummary.
//   - capital: account-wide capital metrics for the Dashboard's wheel P/L
//     card — cash available, deployed, % deployed, top concentration
//     tickers. Computed across the user's full account (all portfolios).

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
        upcomingEvents: [],
        capital: null,
        watchlist: [],
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

  // Honors the user's per-account portfolio selection from settings:
  // `tradingPortfolios = "all"` (or unset) → portfolioIds is undefined,
  // the filter degrades to `{ userId }`. Otherwise scope every wheel-side
  // query to the selected portfolio set so the Dashboard reflects only
  // what the user wants in their trading view. Watchlist and alert event
  // counts remain user-level (they're not portfolio-scoped concepts).
  const portfolioFilter = {
    userId: resolvedUserId!,
    ...(portfolioIds && { id: { in: portfolioIds } }),
  };

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
      watchlistRows,
      allOpenTrades,
      allOpenLots,
      allClosedTrades,
      allClosedLots,
      portfoliosForCapital,
      watchlistAlertConfigs,
    ] = await Promise.all([
      db.trade.count({
        where: { status: "open", portfolio: portfolioFilter },
      }),
      db.stockLot.count({
        where: { status: "OPEN", portfolio: portfolioFilter },
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
          portfolio: portfolioFilter,
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
      // every-2-min cron scan uses, but without dedup/event-write side
      // effects. Honors the portfolio filter for trade/lot-bound configs;
      // watchlist alerts always pass through (user-level concept).
      evaluateActionableConfigsForUser(resolvedUserId!, portfolioIds),
      // Position snapshots for the Dashboard. Trades sorted by ascending DTE
      // so the most time-sensitive show first. Lots sorted by notional
      // (avgCost * shares) descending so the biggest exposures lead.
      db.trade.findMany({
        where: { status: "open", portfolio: portfolioFilter },
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
          portfolio: { select: { name: true } },
        },
      }),
      db.stockLot.findMany({
        where: { status: "OPEN", portfolio: portfolioFilter },
        orderBy: { shares: "desc" },
        take: OPEN_LOTS_LIMIT,
        select: {
          id: true,
          ticker: true,
          shares: true,
          avgCost: true,
          portfolioId: true,
          portfolio: { select: { name: true } },
        },
      }),
      // Watchlist tickers — feeds two things on the Dashboard: the
      // "Watchlist" card (with current quotes) and the Next 7 days
      // calendar (earnings/ex-div for things the user is watching).
      db.watchlistItem.findMany({
        where: { userId: resolvedUserId! },
        select: { id: true, ticker: true, order: true },
        orderBy: { order: "asc" },
      }),
      // All open trades for account-wide capital + concentration math.
      // Cheap projection (no relations); we already cap the displayed list
      // separately in openTradeRows.
      db.trade.findMany({
        where: { status: "open", portfolio: portfolioFilter },
        select: {
          ticker: true,
          type: true,
          strikePrice: true,
          contractsOpen: true,
          contractPrice: true,
        },
      }),
      // All open lots for cost-basis aggregation + concentration.
      db.stockLot.findMany({
        where: { status: "OPEN", portfolio: portfolioFilter },
        select: {
          id: true,
          portfolioId: true,
          ticker: true,
          openedAt: true,
          closedAt: true,
          shares: true,
          avgCost: true,
        },
      }),
      // All-time closed P&L (trades + lots) — needed because currentCapital
      // = capitalBase + total realized, and we report cash as the cash you
      // actually have right now, not just starting + transactions.
      db.trade.findMany({
        where: { status: "closed", portfolio: portfolioFilter },
        select: {
          type: true,
          contracts: true,
          contractPrice: true,
          closingPrice: true,
          premiumCaptured: true,
        },
      }),
      db.stockLot.findMany({
        where: { status: "CLOSED", portfolio: portfolioFilter },
        select: { realizedPnl: true },
      }),
      // Portfolio capital base — startingCapital + (deposits − withdrawals).
      db.portfolio.findMany({
        where: portfolioFilter,
        select: {
          startingCapital: true,
          capitalTransactions: { select: { type: true, amount: true } },
        },
      }),
      // Active watchlist breach configs — surfaces a small "N triggers"
      // badge per watchlist row on the Dashboard. The user-level scope
      // matches how watchlist itself is scoped (not portfolio-bound).
      db.alertConfig.findMany({
        where: {
          userId: resolvedUserId!,
          type: "WATCHLIST_BREACH",
          enabled: true,
        },
        select: { watchlistTicker: true },
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

    // One quote-snapshot batch covers every ticker we need to enrich:
    // open trades + open lots + watchlist items. getQuoteSnapshots
    // dedupes inside so overlaps are free.
    const snapshotTickers = Array.from(
      new Set([
        ...openTradeRows.map((t) => t.ticker.toUpperCase()),
        ...openLotRows.map((l) => l.ticker.toUpperCase()),
        ...watchlistRows.map((w) => w.ticker.toUpperCase()),
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

    // Effective basis per open lot — needed both by the per-row openLots
    // payload below and by the aggregate Capital Deployed math further down.
    // Computed once here so both surfaces agree.
    const stockBasisByLot = await loadEffectiveBasisByLot(db, allOpenLots);

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
        portfolioName: t.portfolio?.name ?? null,
        dte,
        currentPrice: price,
        changePct: snap?.changePct ?? null,
        itm,
      };
    });

    const openLots = openLotRows.map((l) => {
      const snap = snapshotMap.get(l.ticker.toUpperCase());
      // Use effective basis (CSP + long-option premiums during the hold
      // already subtracted) so the portal's per-lot view agrees with the
      // wheel-tracker's stocks table and with the Capital Deployed total
      // computed above.
      const avgCost =
        stockBasisByLot.get(l.id)?.effectiveAvgCost ?? Number(l.avgCost);
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
        portfolioName: l.portfolio?.name ?? null,
        currentPrice: price,
        changePct: snap?.changePct ?? null,
        unrealizedPnl,
        unrealizedPct,
      };
    });

    // Watchlist snapshot — ticker + live quote + count of active price-
    // breach triggers per ticker. Sorted by the user's preferred order
    // from the watchlist itself (already applied by the orderBy above).
    const breachCountByTicker = new Map<string, number>();
    for (const c of watchlistAlertConfigs) {
      if (!c.watchlistTicker) continue;
      const key = c.watchlistTicker.toUpperCase();
      breachCountByTicker.set(key, (breachCountByTicker.get(key) ?? 0) + 1);
    }
    const watchlist = watchlistRows.map((w) => {
      const snap = snapshotMap.get(w.ticker.toUpperCase());
      return {
        id: w.id,
        ticker: w.ticker,
        currentPrice: snap?.price ?? null,
        changePct: snap?.changePct ?? null,
        previousClose: snap?.previousClose ?? null,
        alertCount: breachCountByTicker.get(w.ticker.toUpperCase()) ?? 0,
      };
    });

    // ── Calendar lookahead (Phase 3) ───────────────────────────────────────
    // Pull earnings + ex-div dates for every ticker we have open exposure
    // to — trades, lots, AND watchlist items — then merge with already-known
    // option expiries into one chronological list capped at 7 days out.
    // Watchlist coverage means "AAPL earnings Thursday" surfaces even before
    // you've entered a position. Calendar fetch is best-effort; failure
    // leaves only the expiry rows.
    const sevenDaysOut = new Date(todayStart);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const watchlistTickers = watchlistRows.map((w) => w.ticker.toUpperCase());
    const calendarTickers = Array.from(
      new Set([...snapshotTickers, ...watchlistTickers]),
    );
    let calendarMap: Map<string, { earningsDate: Date | null; exDividendDate: Date | null }> =
      new Map();
    if (calendarTickers.length > 0) {
      try {
        const events = await getCalendarEvents(calendarTickers);
        calendarMap = events;
      } catch (err) {
        console.error("[internal/portal-summary] calendar fetch failed:", err);
      }
    }

    type UpcomingEvent = {
      kind: "expiry" | "earnings" | "exDividend";
      ticker: string;
      date: string;
      daysAway: number;
      // For expiry events, include the trade context so the Portal can deep-link.
      tradeId?: string;
      portfolioId?: string;
      contracts?: number;
      strikePrice?: number;
      tradeType?: string;
    };

    const upcomingEvents: UpcomingEvent[] = [];

    // Option expiries — pull from the already-fetched expiringTradeRows.
    for (const t of expiringTradeRows) {
      upcomingEvents.push({
        kind: "expiry",
        ticker: t.ticker,
        date: t.expirationDate.toISOString(),
        daysAway: Math.max(
          0,
          Math.ceil((t.expirationDate.getTime() - todayStart.getTime()) / 86_400_000),
        ),
        tradeId: t.id,
        portfolioId: t.portfolioId,
        contracts: t.contracts,
        strikePrice: t.strikePrice,
        tradeType: t.type,
      });
    }

    // Earnings + ex-div for each ticker we have open exposure to.
    for (const ticker of calendarTickers) {
      const ev = calendarMap.get(ticker);
      if (!ev) continue;
      if (ev.earningsDate && ev.earningsDate >= todayStart && ev.earningsDate <= sevenDaysOut) {
        upcomingEvents.push({
          kind: "earnings",
          ticker,
          date: ev.earningsDate.toISOString(),
          daysAway: Math.max(
            0,
            Math.ceil((ev.earningsDate.getTime() - todayStart.getTime()) / 86_400_000),
          ),
        });
      }
      if (
        ev.exDividendDate &&
        ev.exDividendDate >= todayStart &&
        ev.exDividendDate <= sevenDaysOut
      ) {
        upcomingEvents.push({
          kind: "exDividend",
          ticker,
          date: ev.exDividendDate.toISOString(),
          daysAway: Math.max(
            0,
            Math.ceil((ev.exDividendDate.getTime() - todayStart.getTime()) / 86_400_000),
          ),
        });
      }
    }

    // Chronological — soonest first; tie-break by kind so expiries lead on
    // the same day (most action-prone).
    const KIND_RANK = { expiry: 0, earnings: 1, exDividend: 2 } as const;
    upcomingEvents.sort((a, b) => {
      const da = Date.parse(a.date);
      const db = Date.parse(b.date);
      if (da !== db) return da - db;
      return KIND_RANK[a.kind] - KIND_RANK[b.kind];
    });

    // ── Capital metrics ────────────────────────────────────────────────────
    // Account-wide cash + deployment + per-ticker concentration. Pulls
    // from the full open-positions queries (not the capped display lists)
    // so totals are accurate even when more than 8 trades or lots exist.
    const capitalBase = portfoliosForCapital.reduce((acc, p) => {
      const starting = Number(p.startingCapital ?? 0);
      const adj = p.capitalTransactions.reduce(
        (s, t) =>
          s + (t.type === "deposit" ? Number(t.amount) : -Number(t.amount)),
        0,
      );
      return acc + starting + adj;
    }, 0);

    const realizedAllTime =
      allClosedTrades.reduce((s, t) => {
        if (t.premiumCaptured != null) return s + Number(t.premiumCaptured);
        const open = Number(t.contractPrice);
        const close = Number(t.closingPrice ?? 0);
        const c = Number(t.contracts);
        return s + (open - close) * 100 * c;
      }, 0) +
      allClosedLots.reduce((s, l) => s + Number(l.realizedPnl ?? 0), 0);

    const currentCapital = capitalBase + realizedAllTime;

    const capitalDeployedOptions = allOpenTrades.reduce(
      (s, t) => s + capitalUsedForTrade(t),
      0,
    );
    // Stock capital uses effective basis (CSP + long-option premiums
    // captured during the hold reduce the sell-floor). Keeps the portal's
    // Capital Deployed in sync with what wheel-tracker shows per row.
    // (stockBasisByLot computed alongside snapshots above.)
    const capitalDeployedStocks = allOpenLots.reduce(
      (s, l) => s + (stockBasisByLot.get(l.id)?.effectiveBasis ?? 0),
      0,
    );
    const capitalDeployed = capitalDeployedOptions + capitalDeployedStocks;
    const cashAvailable = currentCapital - capitalDeployed;
    const percentDeployed =
      currentCapital > 0 ? (capitalDeployed / currentCapital) * 100 : 0;

    // Per-ticker exposure: CSP collateral + open lot effective basis. Long
    // options contribute their premium-at-risk via capitalUsedForTrade;
    // CCs contribute 0 (shares are already covered by the underlying lot).
    const exposureByTicker = new Map<string, number>();
    for (const t of allOpenTrades) {
      const cap = capitalUsedForTrade(t);
      if (cap > 0 && t.ticker)
        exposureByTicker.set(
          t.ticker,
          (exposureByTicker.get(t.ticker) ?? 0) + cap,
        );
    }
    for (const l of allOpenLots) {
      const cap = stockBasisByLot.get(l.id)?.effectiveBasis ?? 0;
      if (cap > 0 && l.ticker)
        exposureByTicker.set(
          l.ticker,
          (exposureByTicker.get(l.ticker) ?? 0) + cap,
        );
    }
    const totalForPct = capitalDeployed || 1;
    const concentration = Array.from(exposureByTicker.entries())
      .map(([ticker, capital]) => ({
        ticker,
        capital,
        pct: (capital / totalForPct) * 100,
      }))
      .sort((a, b) => b.capital - a.capital)
      .slice(0, 5);

    const capital = {
      capitalBase,
      currentCapital,
      cashAvailable,
      capitalDeployed,
      capitalDeployedOptions,
      capitalDeployedStocks,
      percentDeployed,
      concentration,
    };

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
      upcomingEvents,
      capital,
      watchlist,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
