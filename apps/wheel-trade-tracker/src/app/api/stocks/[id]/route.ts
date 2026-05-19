import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth/require-auth";
import { Prisma } from "@/generated/prisma/client";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function toNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { isAdmin, id: userId } = user;

    const params = await props.params;
    const id = params.id;

    const stockLot = await prisma.stockLot.findFirst({
      where: {
        id,
        portfolio: isAdmin ? undefined : { userId },
      },
      include: {
        trades: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!stockLot) {
      return NextResponse.json({ error: "StockLot not found" }, { status: 404 });
    }

    // CSP premium math for the "Cost Basis via Premiums" card. Two queries
    // run in parallel — keeps the GET fast.
    //
    //   cspPremiumDuringHold: closed CSPs on the same (portfolio, ticker)
    //     during this lot's open window, excluding assignments (their net
    //     basis is already in avgCost from the merge/create on assignment,
    //     so counting them here would double-count).
    //
    //   cspPendingPremium: open CSPs on the same (portfolio, ticker) — the
    //     max premium still capturable if they all expire worthless. Used by
    //     the "If All Open Expire" projection alongside open-CC pending.
    //
    // Both are display-only and never mutate avgCost.
    const [cspClosedAgg, openCsps] = await Promise.all([
      prisma.trade.aggregate({
        _sum: { premiumCaptured: true },
        where: {
          portfolioId: stockLot.portfolioId,
          ticker: stockLot.ticker,
          type: "CashSecuredPut",
          status: "closed",
          closeReason: { not: "assigned" },
          closedAt: stockLot.closedAt
            ? { gte: stockLot.openedAt, lte: stockLot.closedAt }
            : { gte: stockLot.openedAt },
        },
      }),
      prisma.trade.findMany({
        where: {
          portfolioId: stockLot.portfolioId,
          ticker: stockLot.ticker,
          type: "CashSecuredPut",
          status: "open",
        },
        select: { contractPrice: true, contractsOpen: true },
      }),
    ]);

    const cspPremiumDuringHold = Number(cspClosedAgg._sum.premiumCaptured ?? 0);
    const cspPendingPremium = openCsps.reduce(
      (sum, t) => sum + (Number(t.contractPrice) || 0) * (t.contractsOpen ?? 0) * 100,
      0,
    );
    const sharesNum = Number(stockLot.shares);
    const avgCostNum = Number(stockLot.avgCost);
    const effectiveAvgCost =
      sharesNum > 0
        ? Math.max(0, avgCostNum - cspPremiumDuringHold / sharesNum)
        : avgCostNum;

    return NextResponse.json({
      stockLot,
      effectiveBasis: {
        cspPremiumDuringHold,
        cspPendingPremium,
        effectiveAvgCost,
      },
    });
  } catch (err) {
    console.error("GET /api/stocks/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { isAdmin, id: userId } = user;

    const params = await props.params;
    const id = params.id;

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = bodyUnknown as {
      closePrice?: number | string | null;
      sharesToClose?: number | string | null;
      // Admin-only direct-edit fields
      adminEdit?: boolean;
      ticker?: string;
      shares?: number | string;
      avgCost?: number | string;
      openedAt?: string;
      notes?: string | null;
      closedAt?: string | null;
      realizedPnl?: number | string | null;
    };

    // Owner notes-only update — any owner can edit the freeform notes on
    // their own lot without invoking close logic or admin-only fields. Only
    // takes effect when the body contains `notes` and no other update keys.
    const isNotesOnly =
      body.notes !== undefined &&
      body.closePrice === undefined &&
      body.sharesToClose === undefined &&
      !body.adminEdit;

    if (isNotesOnly) {
      const lot = await prisma.stockLot.findFirst({
        where: { id, portfolio: isAdmin ? undefined : { userId } },
        select: { id: true },
      });
      if (!lot) {
        return NextResponse.json({ error: "StockLot not found" }, { status: 404 });
      }

      const updated = await prisma.stockLot.update({
        where: { id: lot.id },
        data: { notes: body.notes ?? null },
        include: { trades: { orderBy: { createdAt: "desc" } } },
      });
      return NextResponse.json({ stockLot: updated });
    }

    // Admin direct-edit path — correct individual fields without triggering close logic
    if (isAdmin && body.adminEdit) {
      const updates: Prisma.StockLotUpdateInput = {};
      if (typeof body.ticker === "string" && body.ticker.trim()) {
        updates.ticker = body.ticker.trim().toUpperCase();
      }
      if (body.shares !== undefined) {
        const s = parseInt(String(body.shares), 10);
        if (!isNaN(s) && s > 0) updates.shares = s;
      }
      if (body.avgCost !== undefined) {
        const a = toNumber(body.avgCost);
        if (Number.isFinite(a) && a >= 0) updates.avgCost = new Prisma.Decimal(a);
      }
      if (body.openedAt) {
        const d = new Date(body.openedAt);
        if (!isNaN(d.getTime())) updates.openedAt = d;
      }
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.closedAt !== undefined) {
        updates.closedAt = body.closedAt ? new Date(body.closedAt) : null;
      }
      if (body.closePrice !== undefined && body.closePrice !== null) {
        const cp = toNumber(body.closePrice);
        if (Number.isFinite(cp)) updates.closePrice = new Prisma.Decimal(cp);
      }
      if (body.realizedPnl !== undefined && body.realizedPnl !== null) {
        const pnl = toNumber(body.realizedPnl);
        if (Number.isFinite(pnl)) updates.realizedPnl = new Prisma.Decimal(pnl);
      }

      const updated = await prisma.stockLot.update({
        where: { id },
        data: updates,
        include: { trades: { orderBy: { createdAt: "desc" } } },
      });
      return NextResponse.json({ stockLot: updated });
    }

    // Standard close path
    const closePriceNum = toNumber(body.closePrice);
    if (!Number.isFinite(closePriceNum) || closePriceNum <= 0) {
      return badRequest("closePrice must be a positive number");
    }

    // Load lot with ownership + current basis + open CC trades for validation
    const lot = await prisma.stockLot.findFirst({
      where: {
        id,
        portfolio: isAdmin ? undefined : { userId },
      },
      select: {
        id: true,
        status: true,
        shares: true,
        avgCost: true,
        realizedPnl: true,
        trades: {
          where: { type: "CoveredCall", status: "open" },
          select: { contractsOpen: true },
        },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: "StockLot not found" }, { status: 404 });
    }

    if (lot.status === "CLOSED") {
      return badRequest("StockLot is already closed");
    }

    const sharesInt = Number(lot.shares);
    if (!Number.isFinite(sharesInt) || sharesInt <= 0) {
      return badRequest("StockLot has no shares to close");
    }

    const openCcShares = lot.trades.reduce((sum, t) => sum + t.contractsOpen * 100, 0);
    const maxSellable = sharesInt - openCcShares;

    const sharesToCloseRaw = body.sharesToClose != null ? Number(body.sharesToClose) : null;
    const sharesToClose =
      sharesToCloseRaw != null && Number.isFinite(sharesToCloseRaw)
        ? Math.round(sharesToCloseRaw)
        : sharesInt;

    if (sharesToClose <= 0) {
      return badRequest("sharesToClose must be a positive number");
    }
    if (sharesToClose > sharesInt) {
      return badRequest("Cannot sell more shares than available");
    }
    if (sharesToClose > maxSellable) {
      return badRequest(
        `${openCcShares} shares are covered by open covered calls. Maximum sellable: ${maxSellable} shares.`,
      );
    }

    const avgCost = new Prisma.Decimal(lot.avgCost);
    const closePrice = new Prisma.Decimal(closePriceNum);
    const accumulatedPnl = lot.realizedPnl
      ? new Prisma.Decimal(lot.realizedPnl)
      : new Prisma.Decimal(0);

    const isPartialClose = sharesToClose < sharesInt;

    if (isPartialClose) {
      // Partial sell: reduce shares, accumulate realized P&L, keep lot OPEN
      const soldShares = new Prisma.Decimal(sharesToClose);
      const realizedNow = closePrice.sub(avgCost).mul(soldShares);
      const newRealizedPnl = accumulatedPnl.add(realizedNow);

      const updated = await prisma.stockLot.update({
        where: { id: lot.id },
        data: {
          shares: sharesInt - sharesToClose,
          realizedPnl: newRealizedPnl,
        },
        include: { trades: { orderBy: { createdAt: "desc" } } },
      });

      return NextResponse.json({ stockLot: updated });
    }

    // Full close: set status CLOSED, include any accumulated partial P&L
    const remainingShares = new Prisma.Decimal(sharesInt);
    const realizedNow = closePrice.sub(avgCost).mul(remainingShares);
    const totalRealizedPnl = accumulatedPnl.add(realizedNow);

    const updated = await prisma.stockLot.update({
      where: { id: lot.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closePrice: closePrice,
        realizedPnl: totalRealizedPnl,
      },
      include: {
        trades: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ stockLot: updated });
  } catch (err) {
    console.error("PATCH /api/stocks/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}