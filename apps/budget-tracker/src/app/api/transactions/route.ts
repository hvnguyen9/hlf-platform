import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { Prisma } from "@prisma/client";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function serializeTx(t: {
  id: string; userId: string; amount: { toNumber: () => number }; type: string;
  categoryId: string | null; category: { id: string; name: string; color: string; icon: string; type: string; monthlyBudget: { toNumber: () => number } | null; isDefault: boolean; order: number; userId: string; createdAt: Date; updatedAt: Date } | null;
  description: string | null; notes: string | null; date: Date; createdAt: Date; updatedAt: Date;
}, recurring?: { isRecurring: boolean; recurringId: string }) {
  return {
    ...t,
    amount: t.amount.toNumber(),
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    ...(recurring ?? {}),
    category: t.category ? {
      ...t.category,
      monthlyBudget: t.category.monthlyBudget ? t.category.monthlyBudget.toNumber() : null,
      createdAt: t.category.createdAt.toISOString(),
      updatedAt: t.category.updatedAt.toISOString(),
    } : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const where: Prisma.TransactionWhereInput = { userId: auth.userId };

  if (!isNaN(year) && !isNaN(month)) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };
  } else if (!isNaN(year)) {
    where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }

  if (type === "income" || type === "expense") where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (search) where.description = { contains: search, mode: "insensitive" };

  const [transactions, recurring] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    // Only include recurring when querying a specific month
    !isNaN(year) && !isNaN(month)
      ? prisma.recurringTransaction.findMany({
          where: {
            userId: auth.userId,
            isActive: true,
            ...(type === "income" || type === "expense" ? { type } : {}),
            ...(categoryId ? { categoryId } : {}),
          },
          include: { category: true },
        })
      : Promise.resolve([]),
  ]);

  // Build virtual transaction entries for recurring items
  const maxDay = !isNaN(month) && !isNaN(year) ? daysInMonth(year, month) : 28;
  const virtualRecurring = recurring
    .filter((r) => !search || r.description?.toLowerCase().includes(search.toLowerCase()))
    .map((r) => {
      const day = Math.min(r.dayOfMonth, maxDay);
      const date = new Date(year, month - 1, day);
      return serializeTx(
        { ...r, date, createdAt: r.createdAt, updatedAt: r.updatedAt },
        { isRecurring: true, recurringId: r.id }
      );
    });

  const result = [
    ...transactions.map((t) => serializeTx(t)),
    ...virtualRecurring,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    amount: number; type: string; categoryId?: string | null;
    description?: string; notes?: string; date: string;
  };

  if (!body.amount || !body.type || !body.date) {
    return NextResponse.json({ error: "amount, type, and date are required" }, { status: 400 });
  }

  const tx = await prisma.transaction.create({
    data: {
      userId: auth.userId,
      amount: body.amount,
      type: body.type as "income" | "expense",
      categoryId: body.categoryId || null,
      description: body.description || null,
      notes: body.notes || null,
      date: new Date(body.date),
    },
    include: { category: true },
  });

  return NextResponse.json(serializeTx(tx), { status: 201 });
}
