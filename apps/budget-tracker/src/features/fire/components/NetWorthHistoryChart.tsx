"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCompactCurrency, formatDate } from "@/lib/formatters";
import type { NetWorthSnapshot } from "@/types";

interface Props {
  snapshots: NetWorthSnapshot[];
}

export function NetWorthHistoryChart({ snapshots }: Props) {
  if (snapshots.length < 2) return null;

  const data = [...snapshots]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      date: formatDate(s.date),
      netWorth: s.netWorth,
    }));

  return (
    <div className="bg-card rounded-xl border p-4">
      <h2 className="text-sm font-semibold mb-3">Net Worth History</h2>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactCurrency(v)} width={62} />
          <Tooltip formatter={(v) => formatCompactCurrency(Number(v))} contentStyle={{ fontSize: "12px" }} />
          <Area type="monotone" dataKey="netWorth" stroke="var(--primary)" strokeWidth={2} fill="url(#nwGrad)" name="Net Worth" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
