import type { PrismaClient } from "@/generated/prisma/client";

/**
 * PMCC cost-basis reduction for a long call (LEAP).
 *
 * When covered calls are sold against a long call (a poor man's covered call),
 * the premium captured on those short calls lowers the *effective* cost of the
 * LEAP — the same idea as CC premium reducing a stock lot's avg cost, but for
 * the long-option leg:
 *
 *   effectiveCost = max(0, originalCost − realizedPremium)
 *   effectiveCostPerShare = effectiveCost / (100 × contracts)
 *   effectiveBreakeven   = strike + effectiveCostPerShare
 *
 * Where:
 *   originalCost     — debit paid for the LEAP (contractPrice × 100 × contracts)
 *   realizedPremium  — sum of premiumCaptured on CLOSED covered calls whose
 *                      coveringTradeId is this LEAP. Open CCs are surfaced as a
 *                      count only (their premium isn't realized yet).
 *
 * This is display-only — like cspPremiumDuringHold on stock lots, it never
 * mutates the stored contractPrice and does not change capital-deployed math.
 */

export type PmccBasis = {
  hasCoveredCalls: boolean;
  realizedPremium: number; // from closed CCs against this LEAP
  openCcContracts: number; // contracts of open CCs against it
  openCcCount: number;
  closedCcCount: number;
  contracts: number; // position size used for the basis math
  originalCost: number;
  effectiveCost: number;
  originalCostPerShare: number;
  effectiveCostPerShare: number;
  breakeven: number;
  effectiveBreakeven: number;
  recoveredPct: number; // realizedPremium / originalCost × 100
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

export function projectPmccBasis(args: {
  strikePrice: number;
  contractPrice: number;
  contracts: number;
  realizedPremium: number;
  openCcContracts: number;
  openCcCount: number;
  closedCcCount: number;
}): PmccBasis {
  const {
    strikePrice,
    contractPrice,
    contracts,
    realizedPremium,
    openCcContracts,
    openCcCount,
    closedCcCount,
  } = args;

  const originalCost = contractPrice * 100 * contracts;
  const effectiveCost = Math.max(0, originalCost - realizedPremium);
  const originalCostPerShare = contractPrice;
  const effectiveCostPerShare =
    contracts > 0 ? effectiveCost / (100 * contracts) : contractPrice;
  const breakeven = strikePrice + originalCostPerShare;
  const effectiveBreakeven = strikePrice + effectiveCostPerShare;
  const recoveredPct =
    originalCost > 0 ? (realizedPremium / originalCost) * 100 : 0;

  return {
    hasCoveredCalls: closedCcCount > 0 || openCcCount > 0,
    realizedPremium,
    openCcContracts,
    openCcCount,
    closedCcCount,
    contracts,
    originalCost,
    effectiveCost,
    originalCostPerShare,
    effectiveCostPerShare,
    breakeven,
    effectiveBreakeven,
    recoveredPct,
  };
}

export type PmccCallInput = {
  id: string;
  strikePrice: unknown;
  contractPrice: unknown;
  contractsOpen: unknown;
  contractsInitial: unknown;
  status: string;
};

/**
 * Load the PMCC basis bundle for a single long call. Two cheap aggregate
 * queries over the covered calls bound to it (closed = realized premium,
 * open = in-progress count).
 */
export async function loadPmccBasisForCall(
  prisma: PrismaClient,
  call: PmccCallInput,
): Promise<PmccBasis> {
  const contracts =
    call.status === "open" ? num(call.contractsOpen) : num(call.contractsInitial);

  const [closedAgg, openAgg] = await Promise.all([
    prisma.trade.aggregate({
      _sum: { premiumCaptured: true },
      _count: true,
      where: { coveringTradeId: call.id, type: "CoveredCall", status: "closed" },
    }),
    prisma.trade.aggregate({
      _sum: { contractsOpen: true },
      _count: true,
      where: { coveringTradeId: call.id, type: "CoveredCall", status: "open" },
    }),
  ]);

  return projectPmccBasis({
    strikePrice: num(call.strikePrice),
    contractPrice: num(call.contractPrice),
    contracts,
    realizedPremium: num(closedAgg._sum.premiumCaptured),
    openCcContracts: num(openAgg._sum.contractsOpen),
    openCcCount: openAgg._count,
    closedCcCount: closedAgg._count,
  });
}
