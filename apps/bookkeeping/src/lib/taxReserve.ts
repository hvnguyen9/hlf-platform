// Tax reserve tracking — pure functions, no DB.
// Turns logged set-asides/payments + an estimated-tax target into an
// "are you saving enough?" picture: a year target, what you've covered so
// far, pace vs. the quarterly schedule, and per-quarter status.

export type ReserveKind = "parked" | "paid";

export interface ReserveEntryLike {
  date: string; // ISO
  amount: number;
  kind: ReserveKind;
  quarter?: number | null;
}

export interface QuarterStatus {
  quarter: number; // 1–4
  label: string; // "Q1"
  dueDate: string; // human label, e.g. "April 15, 2026"
  dueTime: number; // epoch ms of due date (UTC)
  recommended: number; // target / 4
  paid: number; // sum of paid entries mapped to this quarter
  isPast: boolean; // due date has passed
  isCurrent: boolean; // the next quarter still owed
  status: "paid" | "partial" | "overdue" | "due" | "upcoming";
}

export interface ReserveSummary {
  target: number; // total estimated tax liability
  targetWithBuffer: number; // target + buffer cushion
  bufferRate: number;
  coveredTotal: number; // everything logged (parked + paid)
  paidTotal: number; // estimated payments actually sent
  parkedTotal: number; // still sitting in the reserve account
  pctOfTarget: number; // 0–1, covered / target
  remainingToTarget: number; // max(0, target − covered)
  expectedToDate: number; // recommended cumulative by today
  pace: number; // covered − expectedToDate; ≥0 ahead, <0 behind
  onTrack: boolean;
  quarters: QuarterStatus[];
}

const DUE_SOON_DAYS = 30;
const EPSILON = 1;

/** The four 1040-ES estimated-payment due dates for a given tax year. */
export function quarterlyDueDates(year: number): Array<{
  quarter: number; label: string; date: Date; dueLabel: string;
}> {
  return [
    { quarter: 1, label: "Q1", date: new Date(Date.UTC(year, 3, 15)), dueLabel: `April 15, ${year}` },
    { quarter: 2, label: "Q2", date: new Date(Date.UTC(year, 5, 16)), dueLabel: `June 16, ${year}` },
    { quarter: 3, label: "Q3", date: new Date(Date.UTC(year, 8, 15)), dueLabel: `September 15, ${year}` },
    { quarter: 4, label: "Q4", date: new Date(Date.UTC(year + 1, 0, 15)), dueLabel: `January 15, ${year + 1}` },
  ];
}

/** Map a payment date to the 1040-ES quarter it most likely satisfies. */
export function quarterForDate(year: number, iso: string): number {
  const t = new Date(iso).getTime();
  const dues = quarterlyDueDates(year);
  for (const d of dues) {
    // grace window: a payment counts for a quarter if made up to ~2 weeks after its due date
    if (t <= d.date.getTime() + 14 * 86400000) return d.quarter;
  }
  return 4;
}

export function computeReserveSummary(opts: {
  year: number;
  target: number; // total estimated tax liability
  bufferRate?: number; // e.g. 0.10
  entries: ReserveEntryLike[];
  now?: Date;
}): ReserveSummary {
  const { year, target, entries } = opts;
  const bufferRate = opts.bufferRate ?? 0.10;
  const now = opts.now ?? new Date();
  const nowT = now.getTime();

  const safeTarget = Math.max(0, target);
  const recommendedPerQuarter = safeTarget / 4;

  const paidTotal = entries.filter((e) => e.kind === "paid").reduce((s, e) => s + e.amount, 0);
  const parkedTotal = entries.filter((e) => e.kind === "parked").reduce((s, e) => s + e.amount, 0);
  const coveredTotal = paidTotal + parkedTotal;

  const dues = quarterlyDueDates(year);

  // Cumulative recommended amount that should be covered by now.
  const quartersDuePassed = dues.filter((d) => d.date.getTime() <= nowT).length;
  const expectedToDate = recommendedPerQuarter * quartersDuePassed;
  const pace = coveredTotal - expectedToDate;

  // First quarter whose due date hasn't passed = the one currently in focus.
  const currentQuarter = dues.find((d) => d.date.getTime() > nowT)?.quarter ?? null;

  const quarters: QuarterStatus[] = dues.map((d) => {
    const paid = entries
      .filter((e) => e.kind === "paid" && (e.quarter ?? quarterForDate(year, e.date)) === d.quarter)
      .reduce((s, e) => s + e.amount, 0);
    const isPast = d.date.getTime() <= nowT;
    const dueSoon = !isPast && d.date.getTime() - nowT <= DUE_SOON_DAYS * 86400000;

    let status: QuarterStatus["status"];
    if (paid >= recommendedPerQuarter - EPSILON && recommendedPerQuarter > 0) status = "paid";
    else if (paid > 0) status = "partial";
    else if (isPast) status = "overdue";
    else if (dueSoon) status = "due";
    else status = "upcoming";

    return {
      quarter: d.quarter,
      label: d.label,
      dueDate: d.dueLabel,
      dueTime: d.date.getTime(),
      recommended: recommendedPerQuarter,
      paid,
      isPast,
      isCurrent: d.quarter === currentQuarter,
      status,
    };
  });

  return {
    target: safeTarget,
    targetWithBuffer: safeTarget * (1 + bufferRate),
    bufferRate,
    coveredTotal,
    paidTotal,
    parkedTotal,
    pctOfTarget: safeTarget > 0 ? coveredTotal / safeTarget : 0,
    remainingToTarget: Math.max(0, safeTarget - coveredTotal),
    expectedToDate,
    pace,
    onTrack: pace >= -EPSILON,
    quarters,
  };
}
