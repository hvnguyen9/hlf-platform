"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface Props {
  score: number; // 0–100
}

export function FireReadinessGauge({ score }: Props) {
  const clamped = Math.min(100, Math.max(0, score));
  const color =
    clamped >= 100 ? "#10b981" :
    clamped >= 75 ? "#22c55e" :
    clamped >= 50 ? "#f59e0b" :
    clamped >= 25 ? "#f97316" : "#ef4444";

  const label =
    clamped >= 100 ? "FIRE Ready! 🔥" :
    clamped >= 75 ? "Almost there!" :
    clamped >= 50 ? "Halfway there" :
    clamped >= 25 ? "Good progress" : "Just starting";

  return (
    <div className="bg-card rounded-xl border p-4 text-center">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">FIRE Readiness</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={130}>
          <RadialBarChart
            cx="50%"
            cy="80%"
            innerRadius="60%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={[{ value: clamped, fill: color }]}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "var(--muted)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <p className={cn("text-3xl font-bold", clamped >= 100 ? "text-emerald-600" : "text-foreground")}>
            {clamped.toFixed(0)}%
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
