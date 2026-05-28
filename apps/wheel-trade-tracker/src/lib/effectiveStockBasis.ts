import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Effective basis for an open stock lot reflects every premium-side
 * adjustment that the wheel strategy has already booked or accrued:
 *
 *   effectiveAvgCost = max(0, avgCost − (cspPremiumDuringHold + longOptionPnlDuringHold) / shares)
 *   effectiveBasis   = effectiveAvgCost × shares
 *
 * Where:
 *   cspPremiumDuringHold     — sum of premiumCaptured on closed, non-assigned
 *                              CSPs on the same (portfolio, ticker) during this
 *                              lot's open window. Display-only; never mutates
 *                              avgCost.
 *   longOptionPnlDuringHold  — net premiumCaptured on closed long Calls/Puts on
 *                              the same (portfolio, ticker) during this lot's
 *                              hold window. Treats long options as "conviction
 *                              P&L on the underlying" — wins lower the
 *                              sell-floor; losses raise it. Display-only.
 *
 * CC premiums on the lot are excluded here because they are already baked
 * into the stored avgCost on close (subtracted at the time the CC was closed
 * profitably). Counting them again would double-dip.
 *
 * This module is the single source of truth for both the read endpoints
 * (`/api/stocks`, `/api/stocks/[id]`) and the capital-deployed calculations
 * (`/api/portfolios/[id]/metrics`, `/api/account/summary`,
 * `/api/internal/v1/portal-summary`) so that per-row Effective Cost Basis
 * sums exactly to the portfolio-level capital deployed by stocks.
 */

export type LotBasisInput = {
  id: string;
  portfolioId: string;
  ticker: string;
  openedAt: Date;
  closedAt: Date | null;
  shares: unknown;
  avgCost: unknown;
};

export type LotEffectiveBasis = {
  cspPremiumDuringHold: number;
  longOptionPnlDuringHold: number;
  effectiveAvgCost: number;
  effectiveBasis: number;
};

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  if (typeof (v as { toNumber?: () => number }).toNumber === "function") {
    const n = (v as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pure projection: given a lot's stored basis + the two premium adjustments,
 * return its effective avg cost and effective basis. Floored at 0 so
 * over-collected premiums don't produce negative basis numbers.
 */
export function projectEffectiveBasis(args: {
  shares: number;
  avgCost: number;
  cspPremiumDuringHold: number;
  longOptionPnlDuringHold: number;
}): { effectiveAvgCost: number; effectiveBasis: number } {
  const { shares, avgCost, cspPremiumDuringHold, longOptionPnlDuringHold } = args;
  if (shares <= 0) {
    return { effectiveAvgCost: avgCost, effectiveBasis: 0 };
  }
  const reductionPerShare =
    (cspPremiumDuringHold + longOptionPnlDuringHold) / shares;
  const effectiveAvgCost = Math.max(0, avgCost - reductionPerShare);
  return { effectiveAvgCost, effectiveBasis: effectiveAvgCost * shares };
}

/**
 * Batch-load the effective-basis bundle for a set of stock lots.
 *
 * Issues 2 aggregate queries per lot in parallel — fast for the typical
 * portfolio (≤ a few dozen lots). If the lot list ever grows large we can
 * pivot to a single grouped query over (portfolioId, ticker, closedAt) and
 * window-filter in memory.
 */
export async function loadEffectiveBasisByLot(
  prisma: PrismaClient,
  lots: LotBasisInput[],
): Promise<Map<string, LotEffectiveBasis>> {
  const result = new Map<string, LotEffectiveBasis>();
  if (lots.length === 0) return result;

  await Promise.all(
    lots.map(async (lot) => {
      const holdWindow = lot.closedAt
        ? { gte: lot.openedAt, lte: lot.closedAt }
        : { gte: lot.openedAt };
      const [cspAgg, longAgg] = await Promise.all([
        prisma.trade.aggregate({
          _sum: { premiumCaptured: true },
          where: {
            portfolioId: lot.portfolioId,
            ticker: lot.ticker,
            type: "CashSecuredPut",
            status: "closed",
            closeReason: { not: "assigned" },
            closedAt: holdWindow,
          },
        }),
        prisma.trade.aggregate({
          _sum: { premiumCaptured: true },
          where: {
            portfolioId: lot.portfolioId,
            ticker: lot.ticker,
            type: { in: ["Call", "Put"] },
            status: "closed",
            closedAt: holdWindow,
          },
        }),
      ]);

      const cspPremiumDuringHold = num(cspAgg._sum.premiumCaptured);
      const longOptionPnlDuringHold = num(longAgg._sum.premiumCaptured);
      const shares = num(lot.shares);
      const avg = num(lot.avgCost);
      const { effectiveAvgCost, effectiveBasis } = projectEffectiveBasis({
        shares,
        avgCost: avg,
        cspPremiumDuringHold,
        longOptionPnlDuringHold,
      });

      result.set(lot.id, {
        cspPremiumDuringHold,
        longOptionPnlDuringHold,
        effectiveAvgCost,
        effectiveBasis,
      });
    }),
  );

  return result;
}
