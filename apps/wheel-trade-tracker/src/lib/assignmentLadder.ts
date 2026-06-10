// Assignment ladder — a forward liquidity stress test for open cash-secured puts.
//
// Each open CSP reserves collateral that stays liquid until its expiration, when
// it either expires worthless (reserve released) or assigns (reserve converts to
// committed cash, i.e. shares bought). The ladder walks expirations in date order
// and tracks how much liquid cash remains after each one assigns — the
// professional worst-case view ("if everything assigns, in what order, and where
// do I run short?"). ITM legs are flagged because they are the assignments that
// are actually likely right now.

export type LadderCsp = {
  id: string;
  ticker: string;
  strikePrice: number;
  contractsOpen: number;
  expirationDate: string; // YYYY-MM-DD
  collateral: number;
};

export type LadderPosition = LadderCsp & { itm: boolean | null };

export type LadderRow = {
  date: string; // YYYY-MM-DD
  positions: LadderPosition[];
  deploys: number; // collateral that converts to committed on this date
  cumulativeDeployed: number;
  freeAfter: number; // liquid cash remaining after this date's assignments
  breached: boolean; // freeAfter < 0 — would need margin past this point
};

export type LadderResult = {
  baseline: number; // liquid cash today = currentCapital − committed (free + reserved)
  totalReserved: number; // sum of all CSP collateral
  rows: LadderRow[];
  breachDate: string | null; // first date liquid cash goes negative, if any
  endFree: number; // liquid cash once every CSP has assigned (== free cash)
};

/**
 * Build the assignment ladder.
 *
 * @param currentCapital  account capital (base + realized)
 * @param committed       cash already out the door (long premium + stock basis)
 * @param csps            open cash-secured puts
 * @param itmFor          optional resolver → true (ITM), false (OTM), null (unknown)
 */
export function buildAssignmentLadder({
  currentCapital,
  committed,
  csps,
  itmFor,
}: {
  currentCapital: number;
  committed: number;
  csps: LadderCsp[];
  itmFor?: (csp: LadderCsp) => boolean | null;
}): LadderResult {
  const baseline = currentCapital - committed;
  const totalReserved = csps.reduce((s, c) => s + c.collateral, 0);

  const byDate = new Map<string, LadderPosition[]>();
  for (const c of csps) {
    const itm = itmFor ? itmFor(c) : null;
    const list = byDate.get(c.expirationDate) ?? [];
    list.push({ ...c, itm });
    byDate.set(c.expirationDate, list);
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

  let cumulative = 0;
  let breachDate: string | null = null;
  const rows: LadderRow[] = dates.map((date) => {
    const positions = byDate
      .get(date)!
      .sort((a, b) => b.collateral - a.collateral);
    const deploys = positions.reduce((s, p) => s + p.collateral, 0);
    cumulative += deploys;
    const freeAfter = baseline - cumulative;
    const breached = freeAfter < 0;
    if (breached && breachDate === null) breachDate = date;
    return { date, positions, deploys, cumulativeDeployed: cumulative, freeAfter, breached };
  });

  return { baseline, totalReserved, rows, breachDate, endFree: baseline - cumulative };
}
