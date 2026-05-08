import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(s: {
  id: string; userId: string; date: Date; totalAssets: { toNumber: () => number };
  totalLiabilities: { toNumber: () => number }; netWorth: { toNumber: () => number };
  notes: string | null; createdAt: Date;
}) {
  return {
    ...s,
    totalAssets: s.totalAssets.toNumber(),
    totalLiabilities: s.totalLiabilities.toNumber(),
    netWorth: s.netWorth.toNumber(),
    date: s.date.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId: auth.userId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(snapshots.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    date: string; totalAssets: number; totalLiabilities: number; notes?: string;
  };

  const netWorth = body.totalAssets - body.totalLiabilities;

  const snapshot = await prisma.netWorthSnapshot.create({
    data: {
      userId: auth.userId,
      date: new Date(body.date),
      totalAssets: body.totalAssets,
      totalLiabilities: body.totalLiabilities,
      netWorth,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(serialize(snapshot), { status: 201 });
}
