import Link from "next/link";
import {
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Home,
  Banknote,
  Inbox,
  Sparkles,
  CalendarClock,
  CalendarDays,
  LineChart,
  Layers,
  Megaphone,
  Coins,
  Wallet,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  BookkeepingSummary,
  BudgetSummary,
  CapitalSummary,
  MtdExpenseRow,
  MtdTransactionRow,
  OpenLotSnapshot,
  OpenTradeSnapshot,
  UpcomingEvent,
  UpcomingEventKind,
  WatchlistSnapshot,
  WheelSummary,
} from "@/lib/clients/types";
import type { TodayItem, TodayItemKind, TodaySeverity } from "@/lib/today-items";

type Props = {
  firstName: string;
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  todayItems: TodayItem[];
  wheelUrl: string;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};


const KIND_ICON: Record<TodayItemKind, React.ElementType> = {
  EXPIRING: CalendarClock,
};

const SEVERITY_DOT: Record<TodaySeverity, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

export function DashboardView({
  firstName,
  wheel,
  bookkeeping,
  budget,
  todayItems,
  wheelUrl,
  errors,
}: Props) {
  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  // True net = trading P&L (wheel) − business expenses (bookkeeping)
  //          − personal spend (budget). All MTD. Computed only when every
  //          source is present so partial outages don't lie.
  const trueNet =
    wheel && bookkeeping && budget
      ? wheel.mtdRealizedPnl - bookkeeping.mtdExpenses - budget.mtdSpent
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your HLF suite at a glance — month to date.
        </p>
      </header>

      {/* Monthly view — how the account is set up + how the wheel is doing */}
      <WheelPnlCard
        wheel={wheel}
        wheelUrl={wheelUrl}
        wheelOffline={Boolean(errors.wheel)}
        loadingHint={errors.wheel ?? "Loading…"}
      />

      {/* Weekly view — what's coming up that needs attention */}
      <Next7Days
        events={wheel?.upcomingEvents ?? []}
        wheelUrl={wheelUrl}
        wheelOffline={Boolean(errors.wheel)}
      />

      {/* Daily view — what to act on today, then drill into positions */}
      <TodayCard items={todayItems} />

      <PositionsSnapshot
        trades={wheel?.openTrades ?? []}
        lots={wheel?.openLots ?? []}
        wheelUrl={wheelUrl}
        wheelOffline={Boolean(errors.wheel)}
      />

      <WatchlistCard
        items={wheel?.watchlist ?? []}
        wheelUrl={wheelUrl}
        wheelOffline={Boolean(errors.wheel)}
      />

      {/* Reference strip — small windows into what makes up each number */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <BusinessExpensesWindow
          bookkeeping={bookkeeping}
          loadingHint={errors.bookkeeping ?? "Loading…"}
        />
        <PersonalExpensesWindow
          budget={budget}
          loadingHint={errors.budget ?? "Loading…"}
        />
        <MtdNetWindow
          wheel={wheel}
          bookkeeping={bookkeeping}
          budget={budget}
          trueNet={trueNet}
        />
      </section>
    </div>
  );
}

// One consolidated "Open positions" card containing both option trades
// (grouped by portfolio) and stock lots. Replaces the previous side-by-
// side OpenTradesCard + OpenLotsCard, which wasted real estate for the
// common case of few-to-no stock lots.
function PositionsSnapshot({
  trades,
  lots,
  wheelUrl,
  wheelOffline,
}: {
  trades: OpenTradeSnapshot[];
  lots: OpenLotSnapshot[];
  wheelUrl: string;
  wheelOffline: boolean;
}) {
  if (wheelOffline) return null;
  if (trades.length === 0 && lots.length === 0) return null;

  // Group trades by portfolio name so per-account exposure is scannable.
  // Preserves the upstream DTE-ascending sort within each group.
  const byPortfolio = new Map<string, OpenTradeSnapshot[]>();
  for (const t of trades) {
    const key = t.portfolioName ?? "Unassigned";
    const arr = byPortfolio.get(key) ?? [];
    arr.push(t);
    byPortfolio.set(key, arr);
  }
  const tradeGroups = Array.from(byPortfolio.entries()).sort(
    ([, a], [, b]) =>
      b.reduce((s, t) => s + t.contracts, 0) -
      a.reduce((s, t) => s + t.contracts, 0),
  );

  const totalCount = trades.length + lots.length;

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Open positions
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {totalCount}
              </Badge>
            )}
            <Link
              href={`${wheelUrl}/summary`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Full view
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Stock lots sub-section — top for consistency with wheel-tracker */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 px-1">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stock lots
              </p>
              <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">
                {lots.length}
              </span>
            </div>
            {lots.length === 0 ? (
              <EmptyHint text="No open stock lots." />
            ) : (
              <ul className="divide-y divide-border/60 rounded-md border border-border/40 overflow-hidden">
                {lots.map((l) => (
                  <li key={l.id}>
                    <LotRow lot={l} wheelUrl={wheelUrl} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Option trades sub-section */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 px-1">
              <LineChart className="w-3 h-3 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Option trades
              </p>
              <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">
                {trades.length}
              </span>
            </div>
            {trades.length === 0 ? (
              <EmptyHint text="No open option trades." />
            ) : (
              <div className="space-y-3">
                {tradeGroups.map(([portfolioName, list]) => (
                  <div key={portfolioName} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 px-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">
                        {portfolioName}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {list.length} trade{list.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="divide-y divide-border/60 rounded-md border border-border/40 overflow-hidden">
                      {list.map((t) => (
                        <li key={t.id}>
                          <TradeRow trade={t} wheelUrl={wheelUrl} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function TradeRow({ trade: t, wheelUrl }: { trade: OpenTradeSnapshot; wheelUrl: string }) {
  return (
    <a
      href={`${wheelUrl}/portfolios/${t.portfolioId}/trades/${t.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{t.ticker}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {formatTradeKind(t.type)} ${t.strikePrice}
          </span>
          {t.itm === true && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 border-rose-500/40 text-rose-600 dark:text-rose-400"
            >
              ITM
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {t.contracts} contract{t.contracts === 1 ? "" : "s"} · {formatDte(t.dte)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono tabular-nums">
          {t.currentPrice != null ? `$${t.currentPrice.toFixed(2)}` : "—"}
        </p>
        <p
          className={cn(
            "text-[11px] font-mono tabular-nums",
            t.changePct == null
              ? "text-muted-foreground"
              : t.changePct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
          )}
        >
          {t.changePct != null
            ? `${t.changePct >= 0 ? "+" : ""}${t.changePct.toFixed(2)}%`
            : "—"}
        </p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
    </a>
  );
}

function LotRow({ lot: l, wheelUrl }: { lot: OpenLotSnapshot; wheelUrl: string }) {
  const pnlPositive = l.unrealizedPnl != null && l.unrealizedPnl >= 0;
  return (
    <a
      href={`${wheelUrl}/portfolios/${l.portfolioId}/stocks/${l.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{l.ticker}</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {l.shares} share{l.shares === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          Avg ${l.avgCost.toFixed(2)} · Now{" "}
          {l.currentPrice != null ? `$${l.currentPrice.toFixed(2)}` : "—"}
          {l.portfolioName && (
            <>
              {" · "}
              <span className="text-muted-foreground/80">{l.portfolioName}</span>
            </>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-mono tabular-nums font-semibold",
            l.unrealizedPnl == null
              ? "text-muted-foreground"
              : pnlPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
          )}
        >
          {l.unrealizedPnl != null
            ? `${pnlPositive ? "+" : ""}${formatCurrency(l.unrealizedPnl)}`
            : "—"}
        </p>
        <p
          className={cn(
            "text-[11px] font-mono tabular-nums",
            l.unrealizedPct == null
              ? "text-muted-foreground"
              : pnlPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
          )}
        >
          {l.unrealizedPct != null
            ? `${pnlPositive ? "+" : ""}${l.unrealizedPct.toFixed(2)}%`
            : "—"}
        </p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
    </a>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="py-4 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function formatTradeKind(type: string): string {
  if (type === "CashSecuredPut") return "CSP";
  if (type === "CoveredCall") return "CC";
  return type;
}

function formatDte(dte: number): string {
  if (dte === 0) return "expires today";
  if (dte === 1) return "1 DTE";
  return `${dte} DTE`;
}

const UPCOMING_KIND_META: Record<
  UpcomingEventKind,
  { icon: React.ElementType; label: string; tone: string; tile: string }
> = {
  expiry: {
    icon: CalendarClock,
    label: "Expiry",
    tone: "text-amber-600 dark:text-amber-400",
    tile: "bg-amber-500/10",
  },
  earnings: {
    icon: Megaphone,
    label: "Earnings",
    tone: "text-violet-600 dark:text-violet-400",
    tile: "bg-violet-500/10",
  },
  exDividend: {
    icon: Coins,
    label: "Ex-div",
    tone: "text-sky-600 dark:text-sky-400",
    tile: "bg-sky-500/10",
  },
};

function Next7Days({
  events,
  wheelUrl,
  wheelOffline,
}: {
  events: UpcomingEvent[];
  wheelUrl: string;
  wheelOffline: boolean;
}) {
  if (wheelOffline) return null;
  if (events.length === 0) return null;

  // Group rows by daysAway (so all "in 2 days" entries sit under one date
  // heading). Map preserves insertion order; the upstream sort is already
  // chronological + kind-prioritized.
  const byDay = new Map<number, UpcomingEvent[]>();
  for (const ev of events) {
    const arr = byDay.get(ev.daysAway) ?? [];
    arr.push(ev);
    byDay.set(ev.daysAway, arr);
  }

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Next 7 days
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {events.length} event{events.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {Array.from(byDay.entries()).map(([daysAway, group]) => (
              <li key={daysAway} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
                  {formatDayHeading(group[0].date, daysAway)}
                </p>
                <ul className="divide-y divide-border rounded-md border border-border/60 overflow-hidden">
                  {group.map((ev) => (
                    <li key={`${ev.kind}-${ev.ticker}-${ev.tradeId ?? ev.date}`}>
                      <UpcomingRow ev={ev} wheelUrl={wheelUrl} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function UpcomingRow({ ev, wheelUrl }: { ev: UpcomingEvent; wheelUrl: string }) {
  const meta = UPCOMING_KIND_META[ev.kind];
  const Icon = meta.icon;

  // Expiry rows deep-link to the trade detail page. Earnings + ex-div
  // events aren't tied to any specific page in wheel-tracker; render as
  // plain rows.
  const href =
    ev.kind === "expiry" && ev.tradeId && ev.portfolioId
      ? `${wheelUrl}/portfolios/${ev.portfolioId}/trades/${ev.tradeId}`
      : null;

  const body = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className={cn("h-7 w-7 rounded-md grid place-items-center shrink-0", meta.tile)}>
        <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{ev.ticker}</span>
          <span className={cn("text-[10px] font-medium uppercase tracking-wider", meta.tone)}>
            {meta.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
          {describeEvent(ev)}
        </p>
      </div>
      {href && (
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
      )}
    </div>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block hover:bg-muted/40 transition-colors"
    >
      {body}
    </a>
  ) : (
    <div>{body}</div>
  );
}

function describeEvent(ev: UpcomingEvent): string {
  if (ev.kind === "expiry") {
    const kind = formatTradeKind(ev.tradeType ?? "");
    const strike = ev.strikePrice != null ? `$${ev.strikePrice}` : "";
    const head = [kind, strike].filter(Boolean).join(" "); // "CSP $101"
    const contracts =
      ev.contracts != null
        ? `${ev.contracts} contract${ev.contracts === 1 ? "" : "s"}`
        : "";
    // " · " separator so adjacent numbers don't visually merge —
    // ("CSP $101 10 contracts" reads as "$10110 contracts" at a glance).
    return [head, contracts].filter(Boolean).join(" · ");
  }
  if (ev.kind === "earnings") return "Earnings report — watch for IV crush";
  if (ev.kind === "exDividend") return "Ex-dividend date — assignment risk on shorts";
  return "";
}

function formatDayHeading(iso: string, daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

// ── Wheel P&L full-row card ──────────────────────────────────────────────
// Sets up the monthly view: MTD/YTD P&L, cash position, deployment % bar,
// and top concentration warning. This is the "month" layer in the
// month→week→day dashboard flow.
function WheelPnlCard({
  wheel,
  wheelUrl,
  wheelOffline,
  loadingHint,
}: {
  wheel: WheelSummary | null;
  wheelUrl: string;
  wheelOffline: boolean;
  loadingHint: string;
}) {
  const capital: CapitalSummary | null = wheel?.capital ?? null;
  const mtd = wheel?.mtdRealizedPnl ?? null;
  const ytd = wheel?.ytdRealizedPnl ?? null;
  // 30% in any single ticker is the conservative wheel-strategy
  // concentration warning threshold — adjust to taste.
  const concentrationThreshold = 30;
  const overConcentrated = capital?.concentration.find(
    (c) => c.pct >= concentrationThreshold,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Wheel Trading
        </CardTitle>
        <Link
          href={`${wheelUrl}/summary`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Full account
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {wheelOffline ? (
          <p className="text-xs text-muted-foreground py-3">{loadingHint}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {/* MTD / YTD P&L block */}
            <div className="md:border-r md:border-border md:pr-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Realized P&amp;L
              </p>
              <p
                className={cn(
                  "text-2xl md:text-3xl font-bold font-mono mt-1",
                  mtd == null
                    ? "text-foreground"
                    : mtd >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                )}
              >
                {mtd != null ? formatCurrency(mtd) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                MTD · YTD{" "}
                <span className="font-mono tabular-nums">
                  {ytd != null ? formatCurrency(ytd, { compact: true }) : "—"}
                </span>
              </p>
            </div>

            {/* Cash available */}
            <div className="md:border-r md:border-border md:pr-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <Wallet className="w-3 h-3" /> Cash Available
              </p>
              <p
                className={cn(
                  "text-2xl md:text-3xl font-bold font-mono mt-1",
                  capital == null
                    ? "text-foreground"
                    : capital.cashAvailable >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                )}
              >
                {capital ? formatCurrency(capital.cashAvailable) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Of{" "}
                <span className="font-mono tabular-nums">
                  {capital ? formatCurrency(capital.currentCapital) : "—"}
                </span>{" "}
                total
              </p>
            </div>

            {/* Cash deployed + utilization bar */}
            <div className="md:border-r md:border-border md:pr-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Deployed
              </p>
              <p className="text-2xl md:text-3xl font-bold font-mono mt-1">
                {capital ? formatCurrency(capital.capitalDeployed) : "—"}
              </p>
              {capital && (
                <>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        capital.percentDeployed >= 85
                          ? "bg-rose-500"
                          : capital.percentDeployed >= 65
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, capital.percentDeployed))}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
                    {capital.percentDeployed.toFixed(1)}% of account
                  </p>
                </>
              )}
            </div>

            {/* Top concentration */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <AlertTriangle
                  className={cn(
                    "w-3 h-3",
                    overConcentrated ? "text-amber-500" : "text-muted-foreground/50",
                  )}
                />{" "}
                Top Concentration
              </p>
              {capital && capital.concentration.length > 0 ? (
                <ul className="space-y-1 mt-1.5">
                  {capital.concentration.slice(0, 3).map((c) => (
                    <li
                      key={c.ticker}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{c.ticker}</span>
                      <span
                        className={cn(
                          "font-mono tabular-nums text-[12px]",
                          c.pct >= concentrationThreshold
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.pct.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">No open positions.</p>
              )}
              {overConcentrated && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 leading-tight">
                  {overConcentrated.ticker} at {overConcentrated.pct.toFixed(0)}% — heavy
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Today action queue card ──────────────────────────────────────────────
// Extracted from the inline JSX so the Dashboard body stays readable.
function TodayCard({ items }: { items: TodayItem[] }) {
  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            Today
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {items.length} item{items.length === 1 ? "" : "s"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 grid place-items-center">
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">You&apos;re all clear</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-snug">
                Nothing expiring in the next 7 days.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border -mt-1">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id}>
                    <a
                      href={item.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 py-3 -mx-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div className="h-8 w-8 rounded-md bg-muted grid place-items-center">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span
                          className={cn(
                            "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card",
                            SEVERITY_DOT[item.severity],
                          )}
                          aria-hidden
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-1.5 transition-colors" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ── Compact KPI card — smaller than KpiCard above ───────────────────────
// Used for the reference strip (business expenses / personal / net) that
// sits below the main wheel-driven sections. Less detail than KpiCard;
// these are status, not action.
// ── WindowKpi cards ─────────────────────────────────────────────────────
// Three small windows into the monthly numbers — each shows the top
// contributors so the user can see *what makes up* the total at a glance.

function WindowKpiShell({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative" | "expense";
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "expense"
          ? "text-rose-800/80 dark:text-rose-300/80"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
          </div>
          <p className={`text-base md:text-lg font-bold font-mono ${toneClass}`}>
            {value}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
        </div>
        {children && (
          <div className="border-t border-border/40 pt-2">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  amount,
  meta,
  swatchColor,
  tone = "expense",
}: {
  label: string;
  amount: number;
  meta?: string;
  swatchColor?: string | null;
  tone?: "expense" | "positive" | "negative" | "neutral";
}) {
  const amountClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "expense"
          ? "text-foreground/80"
          : "text-foreground";
  const sign =
    tone === "positive" && amount >= 0
      ? "+"
      : tone === "negative" && amount < 0
        ? ""
        : tone === "negative"
          ? "-"
          : "";
  return (
    <div className="flex items-center gap-1.5 text-[11px] leading-tight">
      {swatchColor && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: swatchColor }}
          aria-hidden
        />
      )}
      <span className="truncate flex-1 text-muted-foreground">
        {label}
        {meta && <span className="text-muted-foreground/60"> · {meta}</span>}
      </span>
      <span className={cn("font-mono tabular-nums shrink-0", amountClass)}>
        {sign}
        {formatCurrency(Math.abs(amount), { compact: true })}
      </span>
    </div>
  );
}

function BusinessExpensesWindow({
  bookkeeping,
  loadingHint,
}: {
  bookkeeping: BookkeepingSummary | null;
  loadingHint: string;
}) {
  const rows: MtdExpenseRow[] = bookkeeping?.mtdTopExpenses ?? [];
  return (
    <WindowKpiShell
      icon={Briefcase}
      label="Business Exp."
      value={bookkeeping ? formatCurrency(bookkeeping.mtdExpenses) : "—"}
      sub={bookkeeping ? "MTD" : loadingHint}
      tone={bookkeeping ? "expense" : "neutral"}
    >
      {rows.length > 0 && (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <BreakdownRow
              key={`${r.name}-${i}`}
              label={r.name}
              amount={r.amount}
              meta={r.recurring ? "recurring" : r.category ?? undefined}
            />
          ))}
        </div>
      )}
    </WindowKpiShell>
  );
}

function PersonalExpensesWindow({
  budget,
  loadingHint,
}: {
  budget: BudgetSummary | null;
  loadingHint: string;
}) {
  const rows: MtdTransactionRow[] = budget?.mtdTopTransactions ?? [];
  return (
    <WindowKpiShell
      icon={Home}
      label="Personal"
      value={budget ? formatCurrency(budget.mtdSpent) : "—"}
      sub={budget ? "MTD" : loadingHint}
      tone={budget ? "expense" : "neutral"}
    >
      {rows.length > 0 && (
        <div className="space-y-1">
          {rows.map((r) => {
            // Meta priority: recurring tag wins (it's the more useful
            // signal), then category name when distinct from the label.
            const meta = r.recurring
              ? "recurring"
              : r.description && r.categoryName
                ? r.categoryName
                : undefined;
            return (
              <BreakdownRow
                key={r.id}
                label={r.description ?? r.categoryName ?? "Untitled"}
                amount={r.amount}
                meta={meta}
                swatchColor={r.categoryColor}
              />
            );
          })}
        </div>
      )}
    </WindowKpiShell>
  );
}

function MtdNetWindow({
  wheel,
  bookkeeping,
  budget,
  trueNet,
}: {
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  trueNet: number | null;
}) {
  const breakdownReady = wheel && bookkeeping && budget;
  return (
    <WindowKpiShell
      icon={Banknote}
      label="MTD Net"
      value={trueNet != null ? formatCurrency(trueNet) : "—"}
      sub={trueNet != null ? "Trading − exp" : "Need all 3"}
      tone={trueNet != null ? (trueNet >= 0 ? "positive" : "negative") : "neutral"}
    >
      {breakdownReady && (
        <div className="space-y-1">
          <BreakdownRow
            label="Trading"
            amount={wheel!.mtdRealizedPnl}
            tone={wheel!.mtdRealizedPnl >= 0 ? "positive" : "negative"}
          />
          <BreakdownRow
            label="Business"
            amount={-bookkeeping!.mtdExpenses}
            tone="expense"
          />
          <BreakdownRow
            label="Personal"
            amount={-budget!.mtdSpent}
            tone="expense"
          />
        </div>
      )}
    </WindowKpiShell>
  );
}

// ── Watchlist card ───────────────────────────────────────────────────────
// Tickers the user is watching but not yet positioned in. Compact 2-col
// grid on desktop so a 10-ticker list doesn't dominate the page. Each
// row shows the current price, today's change, and a small badge if the
// user has active price-breach triggers on that ticker.
function WatchlistCard({
  items,
  wheelUrl,
  wheelOffline,
}: {
  items: WatchlistSnapshot[];
  wheelUrl: string;
  wheelOffline: boolean;
}) {
  if (wheelOffline) return null;
  if (items.length === 0) return null;

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Watchlist
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {items.length}
            </Badge>
            <Link
              href={`${wheelUrl}/watchlist`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Manage
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {items.map((w) => (
              <li key={w.id}>
                <WatchlistRow item={w} wheelUrl={wheelUrl} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function WatchlistRow({ item: w, wheelUrl }: { item: WatchlistSnapshot; wheelUrl: string }) {
  return (
    <a
      href={`${wheelUrl}/watchlist`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 py-2 px-2.5 rounded-md border border-border/40 hover:bg-muted/50 hover:border-border transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{w.ticker}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono tabular-nums">
          {w.currentPrice != null ? `$${w.currentPrice.toFixed(2)}` : "—"}
        </p>
        <p
          className={cn(
            "text-[11px] font-mono tabular-nums leading-tight",
            w.changePct == null
              ? "text-muted-foreground"
              : w.changePct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
          )}
        >
          {w.changePct != null
            ? `${w.changePct >= 0 ? "+" : ""}${w.changePct.toFixed(2)}%`
            : "—"}
        </p>
      </div>
    </a>
  );
}
