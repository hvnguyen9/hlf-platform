import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(l: { id: string; userId: string; name: string; type: string; balance: { toNumber: () => number }; notes: string | null; createdAt: Date; updatedAt: Date }) {
  return { ...l, balance: l.balance.toNumber(), createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const liabilities = await prisma.btLiability.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(liabilities.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json() as { name: string; type: string; balance: number; notes?: string };
  const liability = await prisma.btLiability.create({
    data: { userId: auth.userId, name: body.name, type: body.type as "mortgage" | "car_loan" | "student_loan" | "credit_card" | "other", balance: body.balance, notes: body.notes || null },
  });
  return NextResponse.json(serialize(liability), { status: 201 });
}
