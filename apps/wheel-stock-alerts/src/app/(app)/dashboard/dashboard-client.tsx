"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, TrendingUp, TrendingDown, AlertTriangle, BarChart2, Activity, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { TickerAvatar } from "@/components/ui/ticker-avatar";
import type { AlertType } from "@prisma-client/client";

const ALERT_META: Record<AlertType, {
  label: string;
  icon: React.ElementType;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
}> = {
  CSP_OPPORTUNITY:   { label: "CSP Opportunity",    icon: TrendingDown, borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  CC_OPPORTUNITY:    { label: "CC Opportunity",      icon: TrendingUp,   borderColor: "border-l-sky-500",     iconColor: "text-sky-500",     badgeColor: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
  SUPPORT_BREAK:     { label: "Support Break",       icon: AlertTriangle,borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  RESISTANCE_BREAK:  { label: "Resistance Breakout", icon: TrendingUp,   borderColor: "border-l-amber-500",   iconColor: "text-amber-500",   badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  VOLUME_SURGE:      { label: "Volume Surge",        icon: BarChart2,    borderColor: "border-l-violet-500",  iconColor: "text-violet-500",  badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
  SMA_CROSS_UP:      { label: "SMA Bullish Cross",   icon: TrendingUp,   borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  SMA_CROSS_DOWN:    { label: "SMA Bearish Cross",   icon: TrendingDown, borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  PROFIT_TARGET:     { label: "Profit Target",       icon: TrendingUp,   borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  ASSIGNMENT_RISK:   { label: "Assignment Risk",     icon: AlertTriangle,borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  ROLL_OPPORTUNITY:  { label: "Roll Opportunity",    icon: TrendingUp,   borderColor: "border-l-violet-500",  iconColor: "text-violet-500",  badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
};

interface AlertRow {
  id: string;
  type: AlertType;
  message: string;
  sentAt: Date;
  channel: string;
  ticker: { symbol: string; name: string };
}

interface SubRow {
  id: string;
  ticker: { id: string; symbol: string; name: string; sector: string | null; lastPrice: number | null; lastUpdated: Date | null };
}

export function DashboardClient({
  recentAlerts,
  subscriptions,
}: {
  recentAlerts: AlertRow[];
  subscriptions: SubRow[];
}) {
  const today = new Date().toDateString();
  const todayCount = recentAlerts.filter(a => new Date(a.sentAt).toDateString() === today).length;
  const channelCount = new Set(recentAlerts.flatMap(a => a.channel.split(",").filter(Boolean))).size;

  const stats = [
    { label: "Subscribed Tickers", value: subscriptions.length, icon: TrendingUp, iconColor: "text-primary", bgColor: "bg-primary/10" },
    { label: "Alerts Today",       value: todayCount,            icon: Bell,       iconColor: "text-sky-500", bgColor: "bg-sky-500/10" },
    { label: "Total Alerts",       value: recentAlerts.length,   icon: Activity,   iconColor: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Active Channels",    value: channelCount,          icon: Radio,      iconColor: "text-sky-500", bgColor: "bg-sky-500/10" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your recent alerts and subscribed tickers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, iconColor, bgColor }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
            <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0", bgColor)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Alerts</h2>
          {recentAlerts.length === 0 ? (
            <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No alerts yet. Subscribe to tickers and alerts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAlerts.slice(0, 10).map((alert) => {
                const meta = ALERT_META[alert.type];
                const Icon = meta.icon;
                return (
                  <div key={alert.id} className={cn(
                    "border border-border border-l-4 rounded-lg p-3 flex items-start gap-3 bg-card",
                    meta.borderColor
                  )}>
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{alert.ticker.symbol}</span>
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", meta.badgeColor)}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(alert.sentAt), { addSuffix: true })} · {alert.channel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscribed Tickers */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Subscribed Tickers</h2>
          {subscriptions.length === 0 ? (
            <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No subscriptions yet. Browse tickers to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map(({ ticker }) => (
                <div key={ticker.id} className="border border-border rounded-lg p-3 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <TickerAvatar symbol={ticker.symbol} size="sm" />
                    <div>
                      <p className="font-semibold text-sm">{ticker.symbol}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ticker.name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {ticker.lastPrice ? (
                      <p className="font-semibold text-sm">${ticker.lastPrice.toFixed(2)}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                    {ticker.sector && (
                      <p className="text-[10px] text-muted-foreground">{ticker.sector}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
