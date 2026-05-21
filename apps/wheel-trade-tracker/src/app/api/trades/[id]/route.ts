// src/app/api/trades/[id]/route.ts
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth/require-auth";
import { NextResponse } from "next/server";
import { CloseReason, Prisma, TradeType } from "@/generated/prisma/client";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { user } = await requireAuth(req);

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const trade = await prisma.trade.findUnique({
    where: { id },
  });

  if (!trade) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(trade);
}

// Edit a trade
// Only allow updating specific fields: notes, strikePrice, contracts, contractPrice, expirationDate
// This is a PATCH request
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const { user } = await requireAuth(req);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const isAdmin = user.isAdmin;

  type PatchBody = {
    notes?: string;
    strikePrice?: number;
    contracts?: number;
    contractPrice?: number;
    expirationDate?: string | Date;
    type?: TradeType | string;
    // Admin-only fields
    ticker?: string;
    entryPrice?: number;
    contractsOpen?: number;
    contractsInitial?: number;
    closingPrice?: number;
    premiumCaptured?: number;
    percentPL?: number;
    closeReason?: CloseReason | string;
    portfolioId?: string;
  };
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const { notes, strikePrice, contracts, contractPrice, expirationDate, type } = body;

  const updates: Prisma.TradeUpdateInput = {};
  if (typeof notes === "string") updates.notes = notes;
  if (typeof strikePrice === "number") updates.strikePrice = strikePrice;
  if (typeof contracts === "number") updates.contracts = contracts;
  if (typeof contractPrice === "number") updates.contractPrice = contractPrice;
  if (typeof expirationDate === "string" || expirationDate instanceof Date) {
    const d = new Date(expirationDate);
    if (!isNaN(d.getTime())) updates.expirationDate = d;
  }
  if (typeof type === "string" && (Object.values(TradeType) as string[]).includes(type)) {
    updates.type = type as TradeType;
  }

  // Admin-only corrections
  if (isAdmin) {
    if (typeof body.ticker === "string" && body.ticker.trim()) {
      updates.ticker = body.ticker.trim().toUpperCase();
    }
    if (typeof body.entryPrice === "number") updates.entryPrice = body.entryPrice;
    if (typeof body.contractsOpen === "number") updates.contractsOpen = body.contractsOpen;
    if (typeof body.contractsInitial === "number") updates.contractsInitial = body.contractsInitial;
    if (typeof body.closingPrice === "number") updates.closingPrice = body.closingPrice;
    if (typeof body.premiumCaptured === "number") updates.premiumCaptured = body.premiumCaptured;
    if (typeof body.percentPL === "number") updates.percentPL = body.percentPL;
    if (
      typeof body.closeReason === "string" &&
      (Object.values(CloseReason) as string[]).includes(body.closeReason)
    ) {
      updates.closeReason = body.closeReason as CloseReason;
    }
    if (typeof body.portfolioId === "string" && body.portfolioId.trim()) {
      const targetId = body.portfolioId.trim();
      const current = await prisma.trade.findUnique({
        where: { id },
        select: { portfolioId: true, stockLotId: true, portfolio: { select: { userId: true } } },
      });
      if (!current) {
        return NextResponse.json({ error: "Trade not found" }, { status: 404 });
      }
      if (targetId !== current.portfolioId) {
        const target = await prisma.portfolio.findUnique({
          where: { id: targetId },
          select: { id: true, userId: true },
        });
        if (!target || target.userId !== current.portfolio.userId) {
          return NextResponse.json(
            { error: "Target portfolio must belong to the same user" },
            { status: 400 },
          );
        }
        if (current.stockLotId) {
          return NextResponse.json(
            {
              error:
                "Trade is linked to a stock lot — move or unlink the lot first.",
            },
            { status: 400 },
          );
        }
        updates.portfolio = { connect: { id: targetId } };
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.trade.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json(updated);
}
