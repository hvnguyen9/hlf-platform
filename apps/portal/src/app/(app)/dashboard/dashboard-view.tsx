import Link from "next/link";
import {
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Home,
  Banknote,
  Inbox,
  Sparkles,
  Bell,
  CalendarClock,
  LineChart,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  BookkeepingSummary,
  BudgetSummary,
  OpenLotSnapshot,
  OpenTradeSnapshot,
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
  ALERT: Bell,
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

      <PositionsSnapshot
        trades={wheel?.openTrades ?? []}
        lots={wheel?.openLots ?? []}
        wheelUrl={wheelUrl}
        wheelOffline={Boolean(errors.wheel)}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          icon={TrendingUp}
          label="MTD Trading P&L"
          value={wheel ? formatCurrency(wheel.mtdRealizedPnl) : "—"}
          sub={
            wheel
              ? `YTD ${formatCurrency(wheel.ytdRealizedPnl, { compact: true })}`
              : errors.wheel ?? "Loading…"
          }
          tone={wheel ? (wheel.mtdRealizedPnl >= 0 ? "positive" : "negative") : "neutral"}
        />
        <KpiCard
          icon={Briefcase}
          label="Business Expenses"
          value={bookkeeping ? formatCurrency(bookkeeping.mtdExpenses) : "—"}
          sub={
            bookkeeping
              ? "Bookkeeping · MTD"
              : errors.bookkeeping ?? "Loading…"
          }
          tone={bookkeeping ? "expense" : "neutral"}
        />
        <KpiCard
          icon={Home}
          label="Personal Spend"
          value={budget ? formatCurrency(budget.mtdSpent) : "—"}
          sub={
            budget
              ? `Budget · MTD`
              : errors.budget ?? "Loading…"
          }
          tone={budget ? "expense" : "neutral"}
        />
        <KpiCard
          icon={Banknote}
          label="MTD Net"
          value={trueNet != null ? formatCurrency(trueNet) : "—"}
          sub={
            trueNet != null
              ? "Trading − business − personal"
              : "Needs all three apps online"
          }
          tone={trueNet != null ? (trueNet >= 0 ? "positive" : "negative") : "neutral"}
        />
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              Today
            </CardTitle>
            {todayItems.length > 0 && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {todayItems.length} item{todayItems.length === 1 ? "" : "s"}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {todayItems.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 grid place-items-center">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">You&apos;re all clear</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-snug">
                  No alerts firing, no trades expiring within a week, no categories near limit.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border -mt-1">
                {todayItems.map((item) => {
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
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative" | "expense";
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
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        </div>
        <p className={`text-xl md:text-2xl font-bold font-mono ${toneClass}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}

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
  // Hide the section entirely when the wheel-tracker is offline — the KPI
  // strip below already surfaces the outage badge, no need to render two
  // empty skeleton cards.
  if (wheelOffline) return null;
  if (trades.length === 0 && lots.length === 0) return null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
      <OpenTradesCard trades={trades} wheelUrl={wheelUrl} />
      <OpenLotsCard lots={lots} wheelUrl={wheelUrl} />
    </section>
  );
}

function OpenTradesCard({
  trades,
  wheelUrl,
}: {
  trades: OpenTradeSnapshot[];
  wheelUrl: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          Open option trades
        </CardTitle>
        <Link
          href={`${wheelUrl}/summary`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          All trades
          {trades.length > 0 && (
            <Badge variant="secondary" className="font-mono text-[10px] ml-1">
              {trades.length}
            </Badge>
          )}
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <EmptyHint text="No open option trades." />
        ) : (
          <ul className="divide-y divide-border -mt-1">
            {trades.map((t) => (
              <li key={t.id}>
                <a
                  href={`${wheelUrl}/portfolios/${t.portfolioId}/trades/${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{t.ticker}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {formatTradeKind(t.type)} ${t.strikePrice}
                      </span>
                      {t.itm === true && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-rose-500/40 text-rose-600 dark:text-rose-400">
                          ITM
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {t.contracts} contract{t.contracts === 1 ? "" : "s"} · {formatDte(t.dte)}
                      {t.portfolioName && (
                        <>
                          {" · "}
                          <span className="text-muted-foreground/80">{t.portfolioName}</span>
                        </>
                      )}
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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OpenLotsCard({
  lots,
  wheelUrl,
}: {
  lots: OpenLotSnapshot[];
  wheelUrl: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Open stock lots
        </CardTitle>
        <Link
          href={`${wheelUrl}/summary`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          All lots
          {lots.length > 0 && (
            <Badge variant="secondary" className="font-mono text-[10px] ml-1">
              {lots.length}
            </Badge>
          )}
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {lots.length === 0 ? (
          <EmptyHint text="No open stock lots." />
        ) : (
          <ul className="divide-y divide-border -mt-1">
            {lots.map((l) => {
              const pnlPositive = l.unrealizedPnl != null && l.unrealizedPnl >= 0;
              return (
                <li key={l.id}>
                  <a
                    href={`${wheelUrl}/portfolios/${l.portfolioId}/stocks/${l.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{l.ticker}</span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {l.shares} share{l.shares === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        Avg ${l.avgCost.toFixed(2)} · Now {l.currentPrice != null ? `$${l.currentPrice.toFixed(2)}` : "—"}
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
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="py-6 text-center">
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
