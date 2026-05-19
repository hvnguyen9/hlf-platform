import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { prisma } from "@/server/prisma";

export type WatchlistPosition = {
  ticker: string;
  trades: {
    id: string;
    portfolioId: string;
    portfolioName: string;
    type: string;
    strikePrice: number;
    expirationDate: string;
    contractsOpen: number;
    contractPrice: number;
  }[];
  stockLots: {
    id: string;
    portfolioId: string;
    portfolioName: string;
    shares: number;
    avgCost: number;
  }[];
};

export type WatchlistResponse = {
  manual: string[];
  positions: WatchlistPosition[];
};

export async function GET(req: Request) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const [manualItems, portfolios, openTrades, openStocks] = await Promise.all([
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { ticker: true },
    }),
    prisma.portfolio.findMany({
      where: { userId },
      select: { id: true, name: true },
    }),
    prisma.trade.findMany({
      where: { status: "open", portfolio: { userId } },
      select: {
        id: true,
        ticker: true,
        type: true,
        strikePrice: true,
        expirationDate: true,
        contractsOpen: true,
        contractPrice: true,
        portfolioId: true,
      },
      orderBy: { ticker: "asc" },
    }),
    prisma.stockLot.findMany({
      where: { status: "OPEN", portfolio: { userId } },
      select: {
        id: true,
        ticker: true,
        shares: true,
        avgCost: true,
        portfolioId: true,
      },
      orderBy: { ticker: "asc" },
    }),
  ]);

  const portfolioMap = Object.fromEntries(
    portfolios.map((p) => [p.id, p.name ?? "Unnamed"])
  );

  const positionMap: Record<string, WatchlistPosition> = {};

  for (const t of openTrades) {
    if (!positionMap[t.ticker]) positionMap[t.ticker] = { ticker: t.ticker, trades: [], stockLots: [] };
    positionMap[t.ticker].trades.push({
      id: t.id,
      portfolioId: t.portfolioId,
      portfolioName: portfolioMap[t.portfolioId] ?? "Unknown",
      type: t.type,
      strikePrice: t.strikePrice,
      expirationDate: t.expirationDate.toISOString(),
      contractsOpen: t.contractsOpen,
      contractPrice: Number(t.contractPrice),
    });
  }

  for (const lot of openStocks) {
    if (!positionMap[lot.ticker]) positionMap[lot.ticker] = { ticker: lot.ticker, trades: [], stockLots: [] };
    positionMap[lot.ticker].stockLots.push({
      id: lot.id,
      portfolioId: lot.portfolioId,
      portfolioName: portfolioMap[lot.portfolioId] ?? "Unknown",
      shares: lot.shares,
      avgCost: Number(lot.avgCost),
    });
  }

  const response: WatchlistResponse = {
    manual: manualItems.map((i) => i.ticker),
    positions: Object.values(positionMap).sort((a, b) => a.ticker.localeCompare(b.ticker)),
  };

  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const { ticker } = await req.json();
  if (!ticker || typeof ticker !== "string") {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  const clean = ticker.trim().toUpperCase();
  if (!clean || clean.length > 10) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  const maxItem = await prisma.watchlistItem.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (maxItem?.order ?? -1) + 1;

  try {
    await prisma.watchlistItem.create({ data: { userId, ticker: clean, order: nextOrder } });
    return NextResponse.json({ ticker: clean }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ticker already in watchlist" }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const { tickers } = await req.json();
  if (!Array.isArray(tickers) || !tickers.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "tickers must be a string array" }, { status: 400 });
  }

  await prisma.$transaction(
    tickers.map((ticker, index) =>
      prisma.watchlistItem.updateMany({
        where: { userId, ticker },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
