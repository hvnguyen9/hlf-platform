// Display helpers shared across the wheel screens.

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const currencyWholeFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(n: number, whole = false): string {
  return (whole ? currencyWholeFmt : currencyFmt).format(n);
}

export function signedMoney(n: number, whole = false): string {
  const v = (whole ? currencyWholeFmt : currencyFmt).format(Math.abs(n));
  if (n > 0) return `+${v}`;
  if (n < 0) return `-${v}`;
  return v;
}

export function pnlColor(n: number | null | undefined): string {
  if (n == null) return "text-slate-700 dark:text-slate-300";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-slate-700 dark:text-slate-300";
}

// Capital-deployment threshold coloring — matches the web's status bar.
// Healthy room (<60%) = green; cautionary (60–85%) = amber; tight (≥85%) = red.
export function deployedColor(pct: number | null | undefined): string {
  if (pct == null) return "text-slate-700 dark:text-slate-300";
  if (pct >= 85) return "text-rose-400";
  if (pct >= 60) return "text-amber-400";
  return "text-emerald-400";
}

// Outflow values (expenses, withdrawals) render in rose so they read as
// money-out at a glance, even though the underlying number is positive.
export function expenseColor(n: number | null | undefined): string {
  if (n == null) return "text-slate-700 dark:text-slate-300";
  if (n <= 0) return "text-slate-700 dark:text-slate-300";
  return "text-rose-400";
}

// DTE coloring. Every state gets a visible color since wheel strategies
// typically live around 30–45 DTE — a default "gray" hue there reads as
// "no color shown at all" to the user.
//   ≤0d (past/today) → rose    · over expiration
//   ≤7d              → rose    · urgent
//   ≤21d             → amber   · watching
//   >21d             → emerald · healthy
export function dteColor(days: number): string {
  if (days <= 0) return "text-rose-500";
  if (days <= 7) return "text-rose-500";
  if (days <= 21) return "text-amber-500";
  return "text-emerald-500";
}

// Win-rate threshold colors. ≥65% emerald, 40–65 amber, <40 rose.
// Helper takes the decimal form (0.65 = 65%) since that's what the
// portfolio metrics endpoint returns. Journal returns it as a
// percentage already, so callers there should pass `pct/100`.
export function winRateColor(pct: number | null | undefined): string {
  if (pct == null) return "text-slate-700 dark:text-slate-300";
  if (pct >= 0.65) return "text-emerald-400";
  if (pct >= 0.4) return "text-amber-400";
  return "text-rose-400";
}

// Compute % "out-of-the-money" for an option. Negative = ITM. Matches
// the same math the web's OpenTradesTable.makeOtmColumn produces:
//   CSP otm = (price - strike) / price * 100  (price above strike → OTM)
//   CC  otm = (strike - price) / price * 100  (strike above price → OTM)
// Returns null when the quote isn't available or the type isn't a
// short option.
export function otmPercent(
  type: string,
  strikePrice: number,
  currentPrice: number | null | undefined,
): number | null {
  if (currentPrice == null || currentPrice <= 0) return null;
  const t = type.toLowerCase().replace(/[\s_-]/g, "");
  if (t === "cashsecuredput" || t === "csp") {
    return ((currentPrice - strikePrice) / currentPrice) * 100;
  }
  if (t === "coveredcall" || t === "cc") {
    return ((strikePrice - currentPrice) / currentPrice) * 100;
  }
  return null;
}

const TYPE_LABEL: Record<string, string> = {
  CashSecuredPut: "CSP",
  cashsecuredput: "CSP",
  csp: "CSP",
  CoveredCall: "CC",
  coveredcall: "CC",
  cc: "CC",
  Put: "Put",
  Call: "Call",
};

export function tradeTypeLabel(type: string): string {
  const norm = type.replace(/\s+/g, "");
  return TYPE_LABEL[type] ?? TYPE_LABEL[norm] ?? type;
}

export function dte(expirationDate: string): number {
  const now = Date.now();
  const exp = new Date(expirationDate).getTime();
  return Math.ceil((exp - now) / 86_400_000);
}

// Human-friendly DTE label.
//   today / tomorrow / yesterday for the immediate window
//   weekday name (e.g. "Fri") for 2–6 days out
//   "Nov 15" for further-out
//   "5d past" for expired-but-not-closed yet
export function dteLabel(expirationDate: string): string {
  const days = dte(expirationDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${Math.abs(days)}d past`;
  if (days <= 6) {
    return new Date(expirationDate).toLocaleDateString(undefined, {
      weekday: "short",
    });
  }
  return new Date(expirationDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function yearMonthOf(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
