"use client";

import * as React from "react";

// Lightweight SVG intraday chart — the day's price line with a dashed
// previous-close baseline for context. Hand-rolled (no Recharts) so it stays a
// few hundred bytes; mirrors the watchlist sparkline but a touch larger and
// with the baseline reference. Used on the trade + stock-lot detail heroes.
export function IntradaySparkline({
  closes,
  up,
  prevClose = null,
  width = 200,
  height = 60,
  className,
}: {
  closes: number[];
  up: boolean;
  prevClose?: number | null;
  width?: number;
  height?: number;
  className?: string;
}) {
  const gradId = React.useId();

  if (closes.length < 3) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-muted-foreground/50"
        style={{ width, height }}
      >
        no intraday data
      </div>
    );
  }

  const color = up ? "#10b981" : "#ef4444";
  const padTop = 4;
  const padBottom = 4;
  const padX = 2;
  const usableW = width - padX * 2;
  const usableH = height - padTop - padBottom;

  let min = Infinity;
  let max = -Infinity;
  for (const v of closes) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const hasPrev = prevClose != null && Number.isFinite(prevClose);
  if (hasPrev) {
    if ((prevClose as number) < min) min = prevClose as number;
    if ((prevClose as number) > max) max = prevClose as number;
  }
  const range = max - min || 1;
  const yFor = (v: number) => padTop + (1 - (v - min) / range) * usableH;

  const step = usableW / (closes.length - 1);
  const points = closes.map((v, i) => [padX + i * step, yFor(v)] as const);
  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const [firstX] = points[0];
  const [lastX] = points[points.length - 1];
  const baselineY = padTop + usableH;
  const areaPath = `${linePath} L${lastX.toFixed(2)},${baselineY} L${firstX.toFixed(2)},${baselineY} Z`;
  const prevY = hasPrev ? yFor(prevClose as number) : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {prevY != null ? (
        <line
          x1={padX}
          y1={prevY}
          x2={width - padX}
          y2={prevY}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="3 3"
          className="text-muted-foreground"
        />
      ) : null}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
