import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

type DbEntry = Awaited<ReturnType<typeof prisma.taxReserveEntry.findFirst>>;

function serialize(e: NonNullable<DbEntry>) {
  return {
    ...e,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  if (!year) return NextResponse.json({ error: "year is required" }, { status: 400 });

  const entries = await prisma.taxReserveEntry.findMany({
    where: { userId: auth.userId, year },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    year: number;
    date: string;
    amount: number;
    kind?: "parked" | "paid";
    quarter?: number | null;
    note?: string | null;
  };

  if (!body.year || !body.date || !body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = await prisma.taxReserveEntry.create({
    data: {
      userId: auth.userId,
      year: body.year,
      date: new Date(body.date),
      amount: body.amount,
      kind: body.kind ?? "parked",
      quarter: body.quarter ?? null,
      note: body.note?.trim() || null,
    },
  });

  return NextResponse.json(serialize(entry), { status: 201 });
}
