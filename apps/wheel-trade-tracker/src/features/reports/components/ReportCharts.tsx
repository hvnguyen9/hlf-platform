"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { format } from "date-fns";

// Loose row shape — accepts both option trades and stock-lot closures from
// /api/reports/closed. Only the fields used by these charts are listed.
export type ReportChartRow = {
  ticker?: string | null;
  type?: string | null;
  closedAt?: string | null;
  totalPL: number;
};

const EMERALD = "#10b981"; // emerald-500
const RED = "#ef4444"; // red-500
const SLATE = "#94a3b8"; // slate-400
const STRATEGY_COLORS: Record<string, string> = {
  CSP: "#10b981", // emerald
  CC: "#06b6d4", // cyan
  "Long Call": "#a855f7", // purple
  "Long Put": "#f97316", // orange
  Stocks: "#f59e0b", // amber
};

function fmtUSDCompact(v: number): string {
  if (Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtUSDExact(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

function normalizeStrategy(type: string | undefined | null): string {
  const t = (type ?? "").replace(/\s+/g, "").toLowerCase();
  if (t === "cashsecuredput" || t === "csp") return "CSP";
  if (t === "coveredcall" || t === "cc") return "CC";
  if (t === "call") return "Long Call";
  if (t === "put") return "Long Put";
  if (t === "stock_lot" || t === "stocklot" || t === "stock") return "Stocks";
  return "Other";
}

function ChartCard({
  title,
  subtitle,
  delay,
  children,
}: {
  title: string;
  subtitle?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="rounded-xl border bg-card p-4 flex flex-col"
    >
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">{children}</div>
    </motion.div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-muted-foreground">
      {msg}
    </div>
  );
}

export function ReportCharts({ rows }: { rows: ReportChartRow[] }) {
  // ── Cumulative P&L over time ─────────────────────────────────────────
  const cumulativeData = useMemo(() => {
    const dated = rows
      .filter((r) => r.closedAt)
      .map((r) => ({ date: new Date(r.closedAt as string).getTime(), pl: r.totalPL ?? 0 }))
      .sort((a, b) => a.date - b.date);

    let running = 0;
    return dated.map((d) => {
      running += d.pl;
      return {
        date: d.date,
        label: format(new Date(d.date), "MMM d"),
        pl: running,
      };
    });
  }, [rows]);

  // ── Top tickers by P&L ───────────────────────────────────────────────
  const topTickers = useMemo(() => {
    const byTicker = new Map<string, number>();
    for (const r of rows) {
      const t = (r.ticker ?? "").toUpperCase().trim();
      if (!t) continue;
      byTicker.set(t, (byTicker.get(t) ?? 0) + (r.totalPL ?? 0));
    }
    return Array.from(byTicker.entries())
      .map(([ticker, pl]) => ({ ticker, pl, abs: Math.abs(pl) }))
      .sort((a, b) => b.abs - a.abs)
      .slice(0, 10)
      .sort((a, b) => b.pl - a.pl); // resort by signed value for nice top→bottom display
  }, [rows]);

  // ── P&L by strategy (donut) ──────────────────────────────────────────
  const strategyBreakdown = useMemo(() => {
    const byStrat = new Map<string, { pl: number; count: number }>();
    for (const r of rows) {
      const strat = normalizeStrategy(r.type);
      const cur = byStrat.get(strat) ?? { pl: 0, count: 0 };
      cur.pl += r.totalPL ?? 0;
      cur.count += 1;
      byStrat.set(strat, cur);
    }
    return Array.from(byStrat.entries())
      .map(([strategy, { pl, count }]) => ({
        strategy,
        pl,
        count,
        abs: Math.abs(pl),
      }))
      .filter((d) => d.abs > 0 || d.count > 0)
      .sort((a, b) => b.abs - a.abs);
  }, [rows]);

  const totalPL = useMemo(
    () => rows.reduce((s, r) => s + (r.totalPL ?? 0), 0),
    [rows],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Cumulative P&L */}
      <ChartCard
        title="Cumulative P&L"
        subtitle={
          cumulativeData.length > 0
            ? `${cumulativeData.length} closes · ending ${fmtUSDExact(totalPL)}`
            : undefined
        }
        delay={0}
      >
        {cumulativeData.length === 0 ? (
          <EmptyState msg="No closed trades in this range" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={totalPL >= 0 ? EMERALD : RED} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={totalPL >= 0 ? EMERALD : RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.15} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtUSDCompact(v as number)}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: SLATE, strokeOpacity: 0.4, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const item = payload[0];
                  const v = item.value as number;
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <div className="text-muted-foreground">{item.payload.label}</div>
                      <div className={`font-semibold tabular-nums ${v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {v >= 0 ? "+" : ""}{fmtUSDExact(v)}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="pl"
                stroke={totalPL >= 0 ? EMERALD : RED}
                strokeWidth={2}
                fill="url(#plGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Top tickers */}
      <ChartCard
        title="Top Tickers by P&L"
        subtitle={topTickers.length > 0 ? `Top ${topTickers.length} of unique tickers` : undefined}
        delay={0.05}
      >
        {topTickers.length === 0 ? (
          <EmptyState msg="No closed trades in this range" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topTickers}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.15} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtUSDCompact(v as number)}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.85, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                cursor={{ fill: SLATE, fillOpacity: 0.08 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload as { ticker: string; pl: number };
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <div className="font-semibold text-foreground">{row.ticker}</div>
                      <div className={`tabular-nums ${row.pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {row.pl >= 0 ? "+" : ""}{fmtUSDExact(row.pl)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pl" radius={[0, 4, 4, 0]}>
                {topTickers.map((d) => (
                  <Cell key={d.ticker} fill={d.pl >= 0 ? EMERALD : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Strategy donut */}
      <ChartCard
        title="P&L by Strategy"
        subtitle={
          strategyBreakdown.length > 0
            ? `${strategyBreakdown.length} strateg${strategyBreakdown.length === 1 ? "y" : "ies"}`
            : undefined
        }
        delay={0.1}
      >
        {strategyBreakdown.length === 0 ? (
          <EmptyState msg="No closed trades in this range" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={strategyBreakdown}
                dataKey="abs"
                nameKey="strategy"
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {strategyBreakdown.map((d) => (
                  <Cell
                    key={d.strategy}
                    fill={STRATEGY_COLORS[d.strategy] ?? SLATE}
                    opacity={d.pl >= 0 ? 1 : 0.45}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload as {
                    strategy: string;
                    pl: number;
                    count: number;
                  };
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <div className="font-semibold text-foreground">{row.strategy}</div>
                      <div className={`tabular-nums ${row.pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {row.pl >= 0 ? "+" : ""}{fmtUSDExact(row.pl)}
                      </div>
                      <div className="text-muted-foreground">
                        {row.count} trade{row.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string, entry) => {
                  const row = entry.payload as unknown as { pl: number };
                  return (
                    <span style={{ color: "currentColor", opacity: row?.pl < 0 ? 0.55 : 0.85 }}>
                      {value}
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
