import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

type DbEntry = Awaited<ReturnType<typeof prisma.bookkeepingEntry.findFirst>>;

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
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Hard cap protects against accidentally returning every entry the user
  // has ever recorded (e.g. when from/to is unset and they've been at this
  // for years). Real views are date-range scoped and far below this.
  const entries = await prisma.bookkeepingEntry.findMany({
    where: {
      userId: auth.userId,
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 5000,
  });

  return NextResponse.json(entries.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    type: "income" | "expense";
    name?: string;
    category: string;
    amount: number;
    description?: string;
    date: string;
    source?: "manual" | "trading";
    recurring?: boolean;
  };

  if (!body.type || !body.category || !body.amount || !body.date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = await prisma.bookkeepingEntry.create({
    data: {
      userId: auth.userId,
      type: body.type,
      name: body.name ?? null,
      category: body.category,
      amount: body.amount,
      description: body.description ?? null,
      date: new Date(body.date),
      source: body.source ?? "manual",
      recurring: body.recurring ?? false,
    },
  });

  return NextResponse.json(serialize(entry), { status: 201 });
}
