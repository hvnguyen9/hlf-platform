import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";
import { fetchDailyBars } from "@/lib/alpaca";
import { computeSignals, evaluateTriggers, DEFAULT_THRESHOLDS } from "@/lib/signals";
import type { TriggerType, Signals, Thresholds } from "@/lib/signals";
import { evaluatePosition } from "@/lib/position-signals";
import {
  fetchWheelOpenPositions,
  isWheelTrackerConfigured,
  type WheelOpenTrade,
} from "@/lib/wheel-tracker-client";
import { sendDigest, type AlertItem, type AnyAlertType } from "@/lib/notify";
import { format, subDays } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";

// Vercel cron: daily at 5pm ET (22:00 UTC) Mon-Fri.
// vercel.json schedules `/api/cron/daily` with that cadence.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — comfortably under Vercel pro's 800s ceiling

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function isCronAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Phase 1: bar ingestion ──────────────────────────────────────────────────
// Fix #1: replace 30 × 220 sequential upserts with one createMany per ticker
// (skipDuplicates honors the unique (tickerId, date) index).

async function ingestBars(): Promise<{ tickerCount: number; barsInserted: number; errors: string[] }> {
  const tickers = await prisma.ticker.findMany({
    where: { isApproved: true },
    select: { id: true, symbol: true },
  });

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 220), "yyyy-MM-dd");

  let barsInserted = 0;
  const errors: string[] = [];

  for (const ticker of tickers) {
    try {
      const bars = await fetchDailyBars(ticker.symbol, startDate, endDate);
      if (bars.length === 0) continue;

      const result = await prisma.priceBar.createMany({
        data: bars.map((b) => ({
          tickerId: ticker.id,
          date: new Date(b.date + "T00:00:00Z"),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: BigInt(Math.round(b.volume)),
        })),
        skipDuplicates: true,
      });
      barsInserted += result.count;

      const latest = bars[bars.length - 1]!;
      await prisma.ticker.update({
        where: { id: ticker.id },
        data: { lastPrice: latest.close, lastUpdated: new Date() },
      });
    } catch (err) {
      errors.push(`${ticker.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { tickerCount: tickers.length, barsInserted, errors };
}

// ─── Phase 2: signal scan + per-user digest dispatch ─────────────────────────
// Fix #2: pre-load the last 24h of alerts into a Set, no per-trigger findFirst.

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

function dedupKey(userId: string, tickerId: string, type: AnyAlertType): string {
  return `${userId}:${tickerId}:${type}`;
}

interface PendingItem {
  userId: string;
  tickerId: string;
  type: AnyAlertType;
  symbol: string;
  signals: Signals;
  message: string;
}

interface UserCtx {
  userId: string;
  email: string;
  emailEnabled: boolean;
  discordWebhook: string | null;
  thresholds: Thresholds;
  watchedPortfolioIds: string[];
}

function buildFallbackMessage(symbol: string, type: AnyAlertType, s: Signals): string {
  const price = s.latestClose;
  const rsi = s.rsi14;
  const nearestSupport = s.supports.length > 0 ? Math.max(...s.supports) : null;
  const nearestResistance = s.resistances.length > 0 ? Math.min(...s.resistances) : null;
  switch (type) {
    case "CSP_OPPORTUNITY":
      return `${symbol} CSP opportunity — RSI ${rsi} at $${price?.toFixed(2)}${nearestSupport ? `, support $${nearestSupport.toFixed(2)}` : ""}.`;
    case "CC_OPPORTUNITY":
      return `${symbol} CC opportunity — RSI ${rsi} at $${price?.toFixed(2)}${nearestResistance ? `, resistance $${nearestResistance.toFixed(2)}` : ""}.`;
    case "SUPPORT_BREAK":
      return `${symbol} broke below support — price $${price?.toFixed(2)}, RSI ${rsi}.`;
    case "RESISTANCE_BREAK":
      return `${symbol} broke above resistance — price $${price?.toFixed(2)}, RSI ${rsi}.`;
    case "VOLUME_SURGE": {
      const m = s.avgVolume20 ? (s.latestVolume! / s.avgVolume20).toFixed(1) : "?";
      return `${symbol} volume ${m}x average — price $${price?.toFixed(2)}.`;
    }
    case "SMA_CROSS_UP":
      return `${symbol} crossed above 50 SMA — bullish trend signal.`;
    case "SMA_CROSS_DOWN":
      return `${symbol} crossed below 50 SMA — bearish trend signal.`;
    default:
      return `${symbol}: signal detected at $${price?.toFixed(2)}.`;
  }
}

async function generateEntryMessage(
  symbol: string,
  type: TriggerType,
  s: Signals,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return buildFallbackMessage(symbol, type, s);

  const parts: string[] = [];
  if (s.rsi14 !== null) parts.push(`RSI(14): ${s.rsi14}`);
  if (s.latestClose !== null) parts.push(`Price: $${s.latestClose.toFixed(2)}`);
  if (s.sma50 !== null) parts.push(`50 SMA: $${s.sma50.toFixed(2)}`);
  if (s.sma200 !== null) parts.push(`200 SMA: $${s.sma200.toFixed(2)}`);
  const nearestSupport = s.supports.length > 0 ? Math.max(...s.supports) : null;
  const nearestResistance = s.resistances.length > 0 ? Math.min(...s.resistances) : null;
  if (nearestSupport !== null && s.latestClose !== null)
    parts.push(`Support: $${nearestSupport.toFixed(2)}`);
  if (nearestResistance !== null && s.latestClose !== null)
    parts.push(`Resistance: $${nearestResistance.toFixed(2)}`);

  try {
    const r = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `You are a concise wheel strategy analyst. Write a 1-2 sentence alert for an options wheel trader.
Ticker: ${symbol}
Signal: ${type}
Data: ${parts.join(" | ")}
Include the specific RSI value, the key price level, and a strike suggestion if applicable. No disclaimers. Max 150 chars.`,
        },
      ],
    });
    const text = r.content[0]?.type === "text" ? r.content[0].text.trim() : null;
    return text || buildFallbackMessage(symbol, type, s);
  } catch {
    return buildFallbackMessage(symbol, type, s);
  }
}

function coerceThresholds(value: unknown): Thresholds {
  if (!value || typeof value !== "object") return { ...DEFAULT_THRESHOLDS };
  const v = value as Partial<Thresholds>;
  return {
    rsiOversold: typeof v.rsiOversold === "number" ? v.rsiOversold : DEFAULT_THRESHOLDS.rsiOversold,
    rsiOverbought:
      typeof v.rsiOverbought === "number" ? v.rsiOverbought : DEFAULT_THRESHOLDS.rsiOverbought,
    supportProximityPct:
      typeof v.supportProximityPct === "number"
        ? v.supportProximityPct
        : DEFAULT_THRESHOLDS.supportProximityPct,
    resistanceProximityPct:
      typeof v.resistanceProximityPct === "number"
        ? v.resistanceProximityPct
        : DEFAULT_THRESHOLDS.resistanceProximityPct,
    volumeSurgeMultiplier:
      typeof v.volumeSurgeMultiplier === "number"
        ? v.volumeSurgeMultiplier
        : DEFAULT_THRESHOLDS.volumeSurgeMultiplier,
  };
}

function coercePortfolioIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function scanAndDispatch(): Promise<{ users: number; alertsSent: number; errors: string[] }> {
  // Pre-load tickers + bars in one query (Fix avoids per-ticker bar fetch in
  // the loop). Limit bars to last 220 trading days to bound memory.
  const tickers = await prisma.ticker.findMany({
    where: { isApproved: true },
    include: {
      priceBars: {
        orderBy: { date: "asc" },
        take: 220,
        select: { date: true, open: true, high: true, low: true, close: true, volume: true },
      },
    },
  });

  const subscriptions = await prisma.subscription.findMany({
    select: { userId: true, tickerId: true },
  });

  const userIds = Array.from(new Set(subscriptions.map((s) => s.userId)));
  if (userIds.length === 0) return { users: 0, alertsSent: 0, errors: [] };

  // Pre-load user identity (auth DB) + per-app prefs (local DB) in parallel.
  const [authUsers, prefRows] = await Promise.all([
    authPrisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    }),
    prisma.userPreferences.findMany({ where: { userId: { in: userIds } } }),
  ]);

  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const prefsById = new Map(prefRows.map((r) => [r.userId, r]));

  function userCtx(userId: string): UserCtx | null {
    const auth = authById.get(userId);
    if (!auth) return null;
    const prefRow = prefsById.get(userId);
    return {
      userId,
      email: auth.email,
      emailEnabled: prefRow?.emailEnabled ?? true,
      discordWebhook: prefRow?.discordWebhook ?? null,
      thresholds: coerceThresholds(prefRow?.thresholds),
      watchedPortfolioIds: coercePortfolioIds(prefRow?.watchedPortfolioIds),
    };
  }

  // Fix #2: pre-load the dedup window into a Set. O(1) lookups vs O(query).
  const recentAlerts = await prisma.alert.findMany({
    where: { sentAt: { gte: new Date(Date.now() - DEDUP_WINDOW_MS) } },
    select: { userId: true, tickerId: true, type: true },
  });
  const dedupSet = new Set(
    recentAlerts.map((a) => dedupKey(a.userId, a.tickerId, a.type as AnyAlertType)),
  );

  // Build subscription index: tickerId -> userId[]
  const subsByTicker = new Map<string, string[]>();
  for (const s of subscriptions) {
    const list = subsByTicker.get(s.tickerId) ?? [];
    list.push(s.userId);
    subsByTicker.set(s.tickerId, list);
  }

  // Build ticker symbol → ticker row map for position evaluation later.
  const tickerBySymbol = new Map(tickers.map((t) => [t.symbol, t]));

  // ─── Entry signals (from bars × subscriptions) ────────────────────────────
  const pending: PendingItem[] = [];

  for (const ticker of tickers) {
    if (ticker.priceBars.length < 15) continue;
    const subs = subsByTicker.get(ticker.id);
    if (!subs || subs.length === 0) continue;

    const bars = ticker.priceBars.map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: Number(b.volume),
    }));
    const signals = computeSignals(bars);
    const prevSignals = bars.length >= 16 ? computeSignals(bars.slice(0, -1)) : null;

    for (const userId of subs) {
      const ctx = userCtx(userId);
      if (!ctx) continue;
      const triggers = evaluateTriggers(signals, prevSignals, ctx.thresholds);
      for (const type of triggers) {
        if (dedupSet.has(dedupKey(userId, ticker.id, type))) continue;
        dedupSet.add(dedupKey(userId, ticker.id, type)); // prevent duplicate within this run
        const message = await generateEntryMessage(ticker.symbol, type, signals);
        pending.push({
          userId,
          tickerId: ticker.id,
          type,
          symbol: ticker.symbol,
          signals,
          message,
        });
      }
    }
  }

  // ─── Position-aware exit signals (from Wheel Tracker per user) ────────────
  if (isWheelTrackerConfigured()) {
    for (const userId of userIds) {
      const ctx = userCtx(userId);
      if (!ctx) continue;

      let positions;
      try {
        positions = await fetchWheelOpenPositions(ctx.email);
      } catch {
        continue;
      }

      const filteredTrades =
        ctx.watchedPortfolioIds.length === 0
          ? positions.trades
          : positions.trades.filter((t) => ctx.watchedPortfolioIds.includes(t.portfolioId));

      for (const trade of filteredTrades) {
        const ticker = tickerBySymbol.get(trade.ticker);
        if (!ticker || ticker.priceBars.length === 0) continue;
        const lastBar = ticker.priceBars[ticker.priceBars.length - 1]!;
        const currentPrice = lastBar.close;

        const positionType = mapTradeTypeToPosition(trade);
        if (!positionType) continue;

        const posSignal = evaluatePosition(
          {
            positionType,
            strikePrice: trade.strikePrice,
            premium: trade.contractPrice,
            contracts: trade.contractsOpen,
            expirationDate: new Date(trade.expirationDate),
            openedAt: new Date(trade.createdAt),
          },
          currentPrice,
        );
        if (!posSignal) continue;
        if (dedupSet.has(dedupKey(userId, ticker.id, posSignal.type))) continue;
        dedupSet.add(dedupKey(userId, ticker.id, posSignal.type));

        // Build a minimal Signals object for the digest UI.
        const tickerSignals = computeSignals(
          ticker.priceBars.map((b) => ({
            date: b.date.toISOString().slice(0, 10),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: Number(b.volume),
          })),
        );

        pending.push({
          userId,
          tickerId: ticker.id,
          type: posSignal.type,
          symbol: ticker.symbol,
          signals: tickerSignals,
          message: posSignal.message,
        });
      }
    }
  }

  // ─── Group + dispatch one digest per user ─────────────────────────────────
  const byUser = new Map<string, PendingItem[]>();
  for (const item of pending) {
    const list = byUser.get(item.userId) ?? [];
    list.push(item);
    byUser.set(item.userId, list);
  }

  let alertsSent = 0;
  const errors: string[] = [];

  for (const [userId, items] of byUser) {
    const ctx = userCtx(userId);
    if (!ctx || items.length === 0) continue;
    try {
      const alertItems: AlertItem[] = items.map((i) => ({
        symbol: i.symbol,
        triggerType: i.type,
        signals: i.signals,
        message: i.message,
      }));
      const channels = await sendDigest({
        userId,
        userEmail: ctx.email,
        discordWebhook: ctx.discordWebhook,
        emailEnabled: ctx.emailEnabled,
        alerts: alertItems,
      });
      const channelStr = channels.join(",") || "none";

      // Fix: batch the Alert.create writes too.
      await prisma.alert.createMany({
        data: items.map((i) => ({
          userId,
          tickerId: i.tickerId,
          type: i.type as AnyAlertType,
          signals: i.signals as object,
          message: i.message,
          channel: channelStr,
        })),
      });

      alertsSent += items.length;
    } catch (err) {
      errors.push(
        `digest→${ctx.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { users: byUser.size, alertsSent, errors };
}

function mapTradeTypeToPosition(trade: WheelOpenTrade): "CSP" | "CC" | null {
  if (trade.type === "CashSecuredPut" || trade.type === "Put") return "CSP";
  if (trade.type === "CoveredCall" || trade.type === "Call") return "CC";
  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const bars = await ingestBars();
  const scan = await scanAndDispatch();
  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: true,
    elapsedMs,
    bars,
    scan,
  });
}
