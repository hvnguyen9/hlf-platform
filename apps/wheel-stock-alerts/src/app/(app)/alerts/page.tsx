import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Bell, TrendingUp, TrendingDown, AlertTriangle, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertType } from "@prisma-client/client";
import type { Signals } from "@/lib/signals";

const ALERT_META: Record<AlertType, {
  label: string;
  icon: React.ElementType;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
}> = {
  CSP_OPPORTUNITY:  { label: "CSP Opportunity",    icon: TrendingDown,  borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  CC_OPPORTUNITY:   { label: "CC Opportunity",      icon: TrendingUp,    borderColor: "border-l-sky-500",     iconColor: "text-sky-500",     badgeColor: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
  SUPPORT_BREAK:    { label: "Support Break",       icon: AlertTriangle, borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  RESISTANCE_BREAK: { label: "Resistance Breakout", icon: TrendingUp,    borderColor: "border-l-amber-500",   iconColor: "text-amber-500",   badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  VOLUME_SURGE:     { label: "Volume Surge",        icon: BarChart2,     borderColor: "border-l-violet-500",  iconColor: "text-violet-500",  badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
  SMA_CROSS_UP:     { label: "SMA Bullish Cross",   icon: TrendingUp,    borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  SMA_CROSS_DOWN:   { label: "SMA Bearish Cross",   icon: TrendingDown,  borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  PROFIT_TARGET:    { label: "Profit Target",       icon: TrendingUp,    borderColor: "border-l-emerald-500", iconColor: "text-emerald-500", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  ASSIGNMENT_RISK:  { label: "Assignment Risk",     icon: AlertTriangle, borderColor: "border-l-rose-500",    iconColor: "text-rose-500",    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
  ROLL_OPPORTUNITY: { label: "Roll Opportunity",    icon: TrendingUp,    borderColor: "border-l-violet-500",  iconColor: "text-violet-500",  badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
};

function SignalPills({ signals }: { signals: Signals }) {
  const pills: { label: string; value: string }[] = [];

  if (signals.rsi14 !== null)
    pills.push({ label: "RSI", value: String(signals.rsi14) });
  if (signals.latestClose !== null)
    pills.push({ label: "Price", value: `$${signals.latestClose.toFixed(2)}` });
  if (signals.supports.length > 0)
    pills.push({ label: "Support", value: signals.supports.map(s => `$${s.toFixed(2)}`).join(" / ") });
  if (signals.resistances.length > 0)
    pills.push({ label: "Resistance", value: signals.resistances.map(r => `$${r.toFixed(2)}`).join(" / ") });
  if (signals.sma50 !== null)
    pills.push({ label: "50 SMA", value: `$${signals.sma50.toFixed(2)}` });
  if (signals.sma200 !== null)
    pills.push({ label: "200 SMA", value: `$${signals.sma200.toFixed(2)}` });
  if (signals.latestVolume !== null && signals.avgVolume20 !== null)
    pills.push({ label: "Vol", value: `${(signals.latestVolume / 1_000_000).toFixed(1)}M (${(signals.latestVolume / signals.avgVolume20).toFixed(1)}x avg)` });

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pills.map(({ label, value }) => (
        <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground">{value}</span>
        </span>
      ))}
    </div>
  );
}

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    include: { ticker: { select: { symbol: true, name: true } } },
    orderBy: { sentAt: "desc" },
    take: 100,
  }).catch(() => []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alert History</h1>
        <p className="text-sm text-muted-foreground mt-1">All alerts sent to you, newest first.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
          <p>No alerts yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const meta = ALERT_META[alert.type];
            const Icon = meta.icon;
            const signals = alert.signals as unknown as Signals;
            return (
              <div key={alert.id} className={cn(
                "border border-border border-l-4 rounded-lg p-4 bg-card flex items-start gap-3",
                meta.borderColor
              )}>
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.iconColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm">{alert.ticker.symbol}</span>
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", meta.badgeColor)}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {format(new Date(alert.sentAt), "MMM d, h:mm a")} · {alert.channel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                  <SignalPills signals={signals} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
