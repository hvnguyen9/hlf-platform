import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Home,
  Banknote,
  Inbox,
  Sparkles,
  Bell,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  BookkeepingSummary,
  BudgetSummary,
  WheelSummary,
} from "@/lib/clients/types";
import type { TodayItem, TodayItemKind, TodaySeverity } from "@/lib/today-items";

type Props = {
  firstName: string;
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  todayItems: TodayItem[];
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};

const TODAY_PREVIEW_LIMIT = 6;

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
            <Link
              href="/today"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all
              {todayItems.length > 0 && (
                <Badge variant="secondary" className="font-mono text-[10px] ml-1">
                  {todayItems.length}
                </Badge>
              )}
              <ArrowRight className="w-3 h-3" />
            </Link>
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
                {todayItems.slice(0, TODAY_PREVIEW_LIMIT).map((item) => {
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

