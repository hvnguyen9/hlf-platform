import { prisma } from "@/server/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import type { Trade } from "@/generated/prisma/client";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const params = await props.params;
  const id = await params.id;

  const { addedContracts, addedContractPrice } = await req.json();

  if (
    typeof addedContracts !== "number" ||
    addedContracts <= 0 ||
    typeof addedContractPrice !== "number" ||
    addedContractPrice <= 0
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const isAdmin = user.isAdmin;
  const trade = await prisma.trade.findFirst({
    where: isAdmin ? { id } : { id, portfolio: { userId } },
  });
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  // Current counts (prefer new fields, fallback to legacy)
  type TradeWithNewFields = Trade & {
    contractsOpen?: number | null;
    contractsInitial?: number | null;
  };
  const extendedTrade = trade as TradeWithNewFields;

  const existingOpen = Number(
    extendedTrade.contractsOpen ?? trade.contracts ?? 0,
  );
  const existingInitial = Number(
    extendedTrade.contractsInitial ?? trade.contracts ?? 0,
  );
  const existingContractPrice = Number(trade.contractPrice ?? 0);

  const totalOpen = Math.trunc(existingOpen + addedContracts);
  const totalInitial = Math.trunc(existingInitial + addedContracts);
  const totalPremium =
    existingContractPrice * existingOpen + addedContractPrice * addedContracts;
  const newAvgPrice =
    totalOpen > 0 ? totalPremium / totalOpen : existingContractPrice;

  const logDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const logEntry = `${logDate}: +${addedContracts}x @ $${addedContractPrice.toFixed(2)}`;
  const existingNotes = (trade as Trade & { notes?: string | null }).notes ?? "";
  const newNotes = existingNotes ? `${logEntry}\n${existingNotes}` : logEntry;

  const updated = await prisma.trade.update({
    where: { id },
    data: {
      contractsOpen: totalOpen,
      contractsInitial: totalInitial,
      contractPrice: newAvgPrice,
      // keep legacy field in sync while migrating UI
      contracts: totalOpen,
      notes: newNotes,
    },
  });

  // NOTE: We no longer update portfolio cash here since `currentCapital` was removed.
  // Cash is derived in metrics from startingCapital, additionalCapital, and open positions.

  return NextResponse.json(updated);
}
