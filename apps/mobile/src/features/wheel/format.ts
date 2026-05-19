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
  if (n == null) return "text-slate-300";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-slate-300";
}

// Capital-deployment threshold coloring — matches the web's status bar.
// Healthy room (<60%) = green; cautionary (60–85%) = amber; tight (≥85%) = red.
export function deployedColor(pct: number | null | undefined): string {
  if (pct == null) return "text-slate-300";
  if (pct >= 85) return "text-rose-400";
  if (pct >= 60) return "text-amber-400";
  return "text-emerald-400";
}

// Outflow values (expenses, withdrawals) render in rose so they read as
// money-out at a glance, even though the underlying number is positive.
export function expenseColor(n: number | null | undefined): string {
  if (n == null) return "text-slate-300";
  if (n <= 0) return "text-slate-300";
  return "text-rose-400";
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
