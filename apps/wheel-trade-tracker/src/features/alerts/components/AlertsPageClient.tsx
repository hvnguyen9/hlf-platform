"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Bell, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@hlf/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import {
  ALERT_TYPE_LABEL,
  describeConfig,
  type AlertConfigType,
} from "@/lib/alerts/types";

interface ConfigRow {
  id: string;
  type: AlertConfigType;
  enabled: boolean;
  params: unknown;
  tradeId: string | null;
  watchlistTicker: string | null;
  stockLotId: string | null;
  lastFiredAt: string | null;
  createdAt: string;
  trade: {
    id: string;
    ticker: string;
    type: string;
    strikePrice: number;
    expirationDate: string;
    status: string;
    portfolioId: string;
  } | null;
  stockLot: {
    id: string;
    ticker: string;
    shares: number;
    avgCost: string | number;
    status: string;
    portfolioId: string;
  } | null;
}

interface EventRow {
  id: string;
  message: string;
  priceAtFire: number;
  firedAt: string;
  configType: AlertConfigType;
  tradeId: string | null;
  watchlistTicker: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AlertsPageClient({
  initialConfigs,
  initialEvents,
}: {
  initialConfigs: ConfigRow[];
  initialEvents: EventRow[];
}) {
  const { data: configsData, mutate: mutateConfigs } = useSWR<{
    configs: ConfigRow[];
  }>("/api/alerts/configs?includeTrade=1", fetcher, {
    fallbackData: { configs: initialConfigs },
    revalidateOnMount: true,
  });
  const configs = configsData?.configs ?? initialConfigs;

  const { data: eventsData, mutate: mutateEvents } = useSWR<{ events: EventRow[] }>(
    "/api/alerts/events?limit=50",
    fetcher,
    { fallbackData: { events: initialEvents }, refreshInterval: 30_000 },
  );
  const events = eventsData?.events ?? initialEvents;

  const enabledCount = configs.filter((c) => c.enabled).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Realtime triggers for your wheel positions and watchlist. Alerts surface as
          in-app toasts and appear in the history below.
        </p>
      </div>

      <ActiveTriggers
        configs={configs}
        enabledCount={enabledCount}
        onChange={() => mutateConfigs()}
      />

      <History events={events} onRefresh={() => mutateEvents()} />
    </div>
  );
}

function ActiveTriggers({
  configs,
  enabledCount,
  onChange,
}: {
  configs: ConfigRow[];
  enabledCount: number;
  onChange: () => void;
}) {
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  async function toggle(c: ConfigRow) {
    setBusyIds((prev) => new Set(prev).add(c.id));
    try {
      const res = await fetch(`/api/alerts/configs/${c.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !c.enabled }),
      });
      if (!res.ok) toast.error("Failed to toggle");
      onChange();
    } finally {
      setBusyIds((prev) => {
        const n = new Set(prev);
        n.delete(c.id);
        return n;
      });
    }
  }

  async function remove(c: ConfigRow) {
    setBusyIds((prev) => new Set(prev).add(c.id));
    try {
      const res = await fetch(`/api/alerts/configs/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove");
        return;
      }
      toast.success("Alert removed");
      onChange();
    } finally {
      setBusyIds((prev) => {
        const n = new Set(prev);
        n.delete(c.id);
        return n;
      });
    }
  }

  if (configs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No triggers yet. Add them inline on any open trade or watchlist row.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Active triggers
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {enabledCount} of {configs.length} enabled
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {configs.map((c) => {
            const busy = busyIds.has(c.id);
            const target = c.trade
              ? `${c.trade.ticker} ${tradeTypeShort(c.trade.type)} $${c.trade.strikePrice} · exp ${format(
                  new Date(c.trade.expirationDate),
                  "MMM d",
                )}`
              : c.stockLot
                ? `${c.stockLot.ticker} (${c.stockLot.shares} sh @ $${Number(c.stockLot.avgCost).toFixed(2)})`
                : c.watchlistTicker
                  ? `${c.watchlistTicker} (watchlist)`
                  : "—";
            const targetHref = c.trade
              ? `/portfolios/${c.trade.portfolioId}/trades/${c.trade.id}`
              : c.stockLot
                ? `/portfolios/${c.stockLot.portfolioId}/stocks/${c.stockLot.id}`
                : c.watchlistTicker
                  ? "/watchlist"
                  : null;
            const orphaned =
              (c.tradeId && !c.trade) || (c.stockLotId && !c.stockLot);

            return (
              <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                <Switch
                  checked={c.enabled}
                  onCheckedChange={() => toggle(c)}
                  disabled={busy}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {ALERT_TYPE_LABEL[c.type]}
                    </Badge>
                    {orphaned && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        target gone
                      </Badge>
                    )}
                    {c.trade && c.trade.status !== "open" && !orphaned && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        trade closed
                      </Badge>
                    )}
                    {c.stockLot && c.stockLot.status !== "OPEN" && !orphaned && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        lot closed
                      </Badge>
                    )}
                    <span className="text-sm font-medium truncate">{target}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {describeConfig(c.type, c.params)}
                    {c.lastFiredAt && (
                      <>
                        {" · last fired "}
                        {formatDistanceToNow(new Date(c.lastFiredAt), { addSuffix: true })}
                      </>
                    )}
                  </p>
                </div>
                {targetHref && (
                  <Link
                    href={targetHref}
                    className="text-muted-foreground hover:text-foreground p-1 -m-1"
                    title="Go to target"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => remove(c)}
                  disabled={busy}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function tradeTypeShort(type: string): string {
  switch (type) {
    case "CashSecuredPut":
    case "Put":
      return "CSP";
    case "CoveredCall":
    case "Call":
      return "CC";
    default:
      return type;
  }
}

function History({
  events,
  onRefresh,
}: {
  events: EventRow[];
  onRefresh: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Recent alerts</CardTitle>
        <Button size="sm" variant="ghost" onClick={onRefresh} className="h-7 text-xs">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No alerts have fired yet.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {ALERT_TYPE_LABEL[e.configType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.firedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1">{e.message}</p>
                {e.tradeId && (
                  <Link
                    href={`/trades/${e.tradeId}`}
                    className="text-xs text-primary underline-offset-2 hover:underline mt-1 inline-block"
                  >
                    View trade →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
