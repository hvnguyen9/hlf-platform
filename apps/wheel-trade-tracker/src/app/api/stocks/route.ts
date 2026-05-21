import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { requireAuth } from "@/server/auth/require-auth";

type StockLotStatusQuery = "open" | "closed";

function parseStatus(value: string | null): Prisma.StockLotWhereInput["status"] | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase() as StockLotStatusQuery;
  if (v === "open") return "OPEN";
  if (v === "closed") return "CLOSED";
  return undefined;
}

export async function GET(req: Request) {
  try {
    const { user } = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { isAdmin } = user;

    const url = new URL(req.url);
    const portfolioId = url.searchParams.get("portfolioId");
    const status = parseStatus(url.searchParams.get("status"));

    if (portfolioId) {
      const portfolio = await prisma.portfolio.findFirst({
        where: isAdmin ? { id: portfolioId } : { id: portfolioId, userId: user.id },
        select: { id: true },
      });
      if (!portfolio) {
        return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
      }
    }

    const stockLots = await prisma.stockLot.findMany({
      where: {
        ...(portfolioId
          ? { portfolioId }
          : { portfolio: { userId: user.id } }),
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        portfolioId: true,
        ticker: true,
        shares: true,
        avgCost: true,
        status: true,
        openedAt: true,
        closedAt: true,
        closePrice: true,
        realizedPnl: true,
        notes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Per-lot premium sums for the Original / Effective basis columns.
    //   ccPremiumCaptured: closed CCs linked to this lot — already baked into
    //     avgCost, so we add it back to recover the original purchase price.
    //   cspPremiumDuringHold: closed non-assigned CSPs on the same
    //     (portfolio, ticker) during the lot's open window — display-only,
    //     never mutates avgCost.
    const lotIds = stockLots.map((l) => l.id);
    const ccAgg = lotIds.length
      ? await prisma.trade.groupBy({
          by: ["stockLotId"],
          _sum: { premiumCaptured: true },
          where: {
            stockLotId: { in: lotIds },
            type: "CoveredCall",
            status: "closed",
          },
        })
      : [];
    const ccByLot = new Map<string, number>();
    for (const row of ccAgg) {
      if (row.stockLotId) {
        ccByLot.set(row.stockLotId, Number(row._sum.premiumCaptured ?? 0));
      }
    }

    const cspByLot = new Map<string, number>();
    await Promise.all(
      stockLots.map(async (lot) => {
        const agg = await prisma.trade.aggregate({
          _sum: { premiumCaptured: true },
          where: {
            portfolioId: lot.portfolioId,
            ticker: lot.ticker,
            type: "CashSecuredPut",
            status: "closed",
            closeReason: { not: "assigned" },
            closedAt: lot.closedAt
              ? { gte: lot.openedAt, lte: lot.closedAt }
              : { gte: lot.openedAt },
          },
        });
        cspByLot.set(lot.id, Number(agg._sum.premiumCaptured ?? 0));
      }),
    );

    const stockLotsWithBasis = stockLots.map((lot) => ({
      ...lot,
      ccPremiumCaptured: ccByLot.get(lot.id) ?? 0,
      cspPremiumDuringHold: cspByLot.get(lot.id) ?? 0,
    }));

    return NextResponse.json({ stockLots: stockLotsWithBasis });
  } catch (err) {
    console.error("GET /api/stocks failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

type CreateStockLotBody = {
  portfolioId: string;
  ticker: string;
  shares: number;
  avgCost: number;
  notes?: string | null;
};

function isCreateBody(value: unknown): value is CreateStockLotBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.portfolioId === "string" &&
    typeof v.ticker === "string" &&
    typeof v.shares === "number" &&
    typeof v.avgCost === "number" &&
    (typeof v.notes === "string" || v.notes === null || typeof v.notes === "undefined")
  );
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = session.user.isAdmin ?? false;
    const userId = session.user.id;

    const bodyUnknown: unknown = await req.json();

    if (!isCreateBody(bodyUnknown)) {
      return NextResponse.json(
        { error: "Invalid body. Expected { portfolioId, ticker, shares, avgCost, notes? }" },
        { status: 400 },
      );
    }

    const { portfolioId } = bodyUnknown;
    const ticker = bodyUnknown.ticker.trim().toUpperCase();
    const shares = Math.trunc(bodyUnknown.shares);
    const avgCost = bodyUnknown.avgCost;
    const notes = bodyUnknown.notes ?? null;

    if (!ticker) return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
    if (!Number.isFinite(shares) || shares <= 0) {
      return NextResponse.json({ error: "Shares must be a positive integer" }, { status: 400 });
    }
    if (!Number.isFinite(avgCost) || avgCost <= 0) {
      return NextResponse.json({ error: "avgCost must be a positive number" }, { status: 400 });
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: isAdmin ? { id: portfolioId } : { id: portfolioId, userId },
      select: { id: true },
    });
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    const created = await prisma.stockLot.create({
      data: {
        portfolioId,
        ticker,
        shares,
        avgCost: new Prisma.Decimal(avgCost),
        notes,
      },
    });

    return NextResponse.json({ stockLot: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/stocks failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}