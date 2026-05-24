import { ArrowUpRight, Bell, CalendarClock, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { cn } from "@/lib/utils";
import type { TodayItem, TodayItemKind, TodaySeverity } from "@/lib/today-items";

const KIND_ICON: Record<TodayItemKind, React.ElementType> = {
  ALERT: Bell,
  EXPIRING: CalendarClock,
};

const KIND_LABEL: Record<TodayItemKind, string> = {
  ALERT: "Alert",
  EXPIRING: "Expiring",
};

const SEVERITY_DOT: Record<TodaySeverity, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

const SEVERITY_RING: Record<TodaySeverity, string> = {
  high: "ring-rose-500/30",
  medium: "ring-amber-500/30",
  low: "ring-border",
};

type Props = {
  firstName: string;
  items: TodayItem[];
  errors: {
    wheel?: string;
  };
};

export function TodayView({ firstName, items, errors }: Props) {
  const greeting = firstName ? `Today, ${firstName}` : "Today";
  const offline = Object.entries(errors)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);

  const alertItems = items.filter((i) => i.kind === "ALERT");
  const expiringItems = items.filter((i) => i.kind === "EXPIRING");
  const highCount = items.filter((i) => i.severity === "high").length;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            What needs action across your open positions.
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-mono">
              {items.length} item{items.length === 1 ? "" : "s"}
              {highCount > 0 ? ` · ${highCount} high` : ""}
            </Badge>
          </div>
        )}
      </header>

      {offline.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
              Couldn&apos;t reach {offline.join(", ")}. The inbox shows what we could fetch.
            </p>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 grid place-items-center">
              <Sparkles className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">You&apos;re all clear</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Nothing in your alert zones right now and nothing expiring within a week.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {alertItems.length > 0 && (
            <Section
              title="Action alerts"
              subtitle="Positions currently in your alert zones — live state"
              items={alertItems}
            />
          )}
          {expiringItems.length > 0 && (
            <Section
              title="Expiring this week"
              subtitle="Decide: close, roll, or let expire"
              items={expiringItems}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: TodayItem[];
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{items.length}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id}>
            <TodayRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TodayRow({ item }: { item: TodayItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <a
      href={item.actionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block rounded-lg border bg-card transition-all hover:shadow-sm ring-1 ring-transparent hover:ring-2",
        SEVERITY_RING[item.severity],
      )}
    >
      <div className="p-3.5 flex items-start gap-3">
        <div className="relative shrink-0 mt-0.5">
          <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
              SEVERITY_DOT[item.severity],
            )}
            aria-hidden
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
              {KIND_LABEL[item.kind]}
            </Badge>
            {item.timestamp && (
              <span className="text-[11px] text-muted-foreground">
                {formatRelative(item.timestamp)}
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
            {item.description}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          <span className="hidden sm:inline">{item.actionLabel}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </a>
  );
}

function formatRelative(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const absMin = Math.floor(Math.abs(diffMs) / 60_000);
  const sign = diffMs >= 0 ? "in " : "";
  const suffix = diffMs >= 0 ? "" : " ago";
  if (absMin < 1) return "just now";
  if (absMin < 60) return `${sign}${absMin}m${suffix}`;
  const hours = Math.floor(absMin / 60);
  if (hours < 24) return `${sign}${hours}h${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${sign}${days}d${suffix}`;
  return new Date(iso).toLocaleDateString();
}
