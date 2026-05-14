import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import prisma from "@/server/prisma";
import { z } from "zod";
import { paramsByType } from "@/lib/alerts/types";

const createBody = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PROFIT_TARGET"),
    tradeId: z.string().min(1),
    params: paramsByType.PROFIT_TARGET,
  }),
  z.object({
    type: z.literal("ASSIGNMENT_RISK"),
    tradeId: z.string().min(1),
    params: paramsByType.ASSIGNMENT_RISK,
  }),
  z.object({
    type: z.literal("ROLL_OPPORTUNITY"),
    tradeId: z.string().min(1),
    params: paramsByType.ROLL_OPPORTUNITY,
  }),
  z.object({
    type: z.literal("WATCHLIST_BREACH"),
    watchlistTicker: z.string().min(1).max(10),
    params: paramsByType.WATCHLIST_BREACH,
  }),
  z.object({
    type: z.literal("LOT_PRICE_BREACH"),
    stockLotId: z.string().min(1),
    params: paramsByType.LOT_PRICE_BREACH,
  }),
]);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tradeId = searchParams.get("tradeId");
  const ticker = searchParams.get("watchlistTicker");
  const stockLotId = searchParams.get("stockLotId");
  const includeTrade = searchParams.get("includeTrade") === "1";

  const configs = await prisma.alertConfig.findMany({
    where: {
      userId: session.user.id,
      ...(tradeId ? { tradeId } : {}),
      ...(ticker ? { watchlistTicker: ticker } : {}),
      ...(stockLotId ? { stockLotId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!includeTrade) return NextResponse.json({ configs });

  // Enrich trade- and lot-bound configs with surface fields so the /alerts
  // page can render meaningful rows without a second round-trip.
  const tradeIds = configs
    .map((c) => c.tradeId)
    .filter((id): id is string => Boolean(id));
  const trades = tradeIds.length
    ? await prisma.trade.findMany({
        where: { id: { in: tradeIds } },
        select: {
          id: true,
          ticker: true,
          type: true,
          strikePrice: true,
          expirationDate: true,
          status: true,
          portfolioId: true,
        },
      })
    : [];
  const tradeById = new Map(trades.map((t) => [t.id, t]));

  const lotIds = configs
    .map((c) => c.stockLotId)
    .filter((id): id is string => Boolean(id));
  const lots = lotIds.length
    ? await prisma.stockLot.findMany({
        where: { id: { in: lotIds } },
        select: {
          id: true,
          ticker: true,
          shares: true,
          avgCost: true,
          status: true,
          portfolioId: true,
        },
      })
    : [];
  const lotById = new Map(lots.map((l) => [l.id, l]));

  const enriched = configs.map((c) => ({
    ...c,
    trade: c.tradeId ? tradeById.get(c.tradeId) ?? null : null,
    stockLot: c.stockLotId ? lotById.get(c.stockLotId) ?? null : null,
  }));
  return NextResponse.json({ configs: enriched });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parse = createBody.safeParse(await request.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body", details: parse.error.issues }, { status: 400 });
  }
  const data = parse.data;

  // Ownership check: confirm the bound entity is the user's own.
  if (
    data.type === "PROFIT_TARGET" ||
    data.type === "ASSIGNMENT_RISK" ||
    data.type === "ROLL_OPPORTUNITY"
  ) {
    const trade = await prisma.trade.findUnique({
      where: { id: data.tradeId },
      include: { portfolio: { select: { userId: true } } },
    });
    if (!trade || trade.portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
  } else if (data.type === "LOT_PRICE_BREACH") {
    const lot = await prisma.stockLot.findUnique({
      where: { id: data.stockLotId },
      include: { portfolio: { select: { userId: true } } },
    });
    if (!lot || lot.portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Stock lot not found" }, { status: 404 });
    }
  }

  const created = await prisma.alertConfig.create({
    data: {
      userId: session.user.id,
      type: data.type,
      tradeId:
        data.type === "PROFIT_TARGET" ||
        data.type === "ASSIGNMENT_RISK" ||
        data.type === "ROLL_OPPORTUNITY"
          ? data.tradeId
          : null,
      watchlistTicker:
        data.type === "WATCHLIST_BREACH" ? data.watchlistTicker.toUpperCase() : null,
      stockLotId: data.type === "LOT_PRICE_BREACH" ? data.stockLotId : null,
      params: data.params,
    },
  });
  return NextResponse.json({ config: created }, { status: 201 });
}
