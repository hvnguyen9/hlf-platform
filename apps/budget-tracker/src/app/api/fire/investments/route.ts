import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(inv: {
  id: string; userId: string; name: string; type: string;
  currentValue: { toNumber: () => number }; lastUpdated: Date;
  notes: string | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    ...inv,
    currentValue: inv.currentValue.toNumber(),
    lastUpdated: inv.lastUpdated.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const investments = await prisma.investment.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(investments.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    name: string; type: string; currentValue: number; notes?: string;
  };

  const investment = await prisma.investment.create({
    data: {
      userId: auth.userId,
      name: body.name,
      type: body.type as "brokerage" | "retirement_401k" | "IRA" | "roth_IRA" | "crypto" | "real_estate" | "other",
      currentValue: body.currentValue,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(serialize(investment), { status: 201 });
}
