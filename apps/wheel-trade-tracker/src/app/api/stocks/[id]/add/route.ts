import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { Prisma } from "@/generated/prisma/client";
import { getEffectiveUserId } from "@/server/auth/getEffectiveUserId";

// POST /api/stocks/[id]/add — average down (or up) into an existing OPEN lot.
// Body: { addedShares: number, costPerShare: number, note?: string }
// New avgCost = (oldAvg * oldShares + costPerShare * addedShares) / totalShares.
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = session.user.isAdmin ?? false;
    const userId = await getEffectiveUserId(session.user.id, isAdmin);

    const params = await props.params;
    const id = params.id;

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = bodyUnknown as {
      addedShares?: number | string;
      costPerShare?: number | string;
      note?: string | null;
    };

    const addedShares = Math.trunc(Number(body.addedShares));
    const costPerShare = Number(body.costPerShare);

    if (!Number.isFinite(addedShares) || addedShares <= 0) {
      return NextResponse.json(
        { error: "addedShares must be a positive integer" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(costPerShare) || costPerShare < 0) {
      return NextResponse.json(
        { error: "costPerShare must be a non-negative number" },
        { status: 400 },
      );
    }

    const lot = await prisma.stockLot.findFirst({
      where: { id, portfolio: isAdmin ? undefined : { userId } },
      select: { id: true, status: true, shares: true, avgCost: true, notes: true },
    });

    if (!lot) {
      return NextResponse.json({ error: "StockLot not found" }, { status: 404 });
    }
    if (lot.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot add shares to a closed lot" },
        { status: 400 },
      );
    }

    const oldShares = new Prisma.Decimal(lot.shares);
    const addedSharesD = new Prisma.Decimal(addedShares);
    const oldAvg = new Prisma.Decimal(lot.avgCost);
    const addCost = new Prisma.Decimal(costPerShare);
    const totalShares = oldShares.add(addedSharesD);
    const newAvgCost = oldAvg
      .mul(oldShares)
      .add(addCost.mul(addedSharesD))
      .div(totalShares);

    const noteLine = `Added ${addedShares} sh @ $${costPerShare.toFixed(2)} → avg cost ${newAvgCost.toFixed(4)}${body.note ? ` (${body.note})` : ""}`;
    const newNotes = lot.notes ? `${lot.notes}\n${noteLine}` : noteLine;

    const updated = await prisma.stockLot.update({
      where: { id: lot.id },
      data: {
        shares: totalShares.toNumber(),
        avgCost: newAvgCost,
        notes: newNotes,
      },
      include: { trades: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ stockLot: updated });
  } catch (err) {
    console.error("POST /api/stocks/[id]/add failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
