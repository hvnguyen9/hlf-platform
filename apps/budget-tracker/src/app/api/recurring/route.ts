import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(r: {
  id: string; userId: string; amount: { toNumber: () => number }; type: string;
  categoryId: string | null; category: { id: string; name: string; color: string; icon: string; type: string; monthlyBudget: { toNumber: () => number } | null; isDefault: boolean; order: number; userId: string; createdAt: Date; updatedAt: Date } | null;
  description: string | null; notes: string | null; dayOfMonth: number; isActive: boolean;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    ...r,
    amount: r.amount.toNumber(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    category: r.category ? {
      ...r.category,
      monthlyBudget: r.category.monthlyBudget ? r.category.monthlyBudget.toNumber() : null,
      createdAt: r.category.createdAt.toISOString(),
      updatedAt: r.category.updatedAt.toISOString(),
    } : null,
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const items = await prisma.recurringTransaction.findMany({
    where: { userId: auth.userId },
    include: { category: true },
    orderBy: [{ type: "desc" }, { dayOfMonth: "asc" }],
  });

  return NextResponse.json(items.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    amount: number; type: string; categoryId?: string | null;
    description?: string; notes?: string; dayOfMonth: number;
  };

  if (!body.amount || !body.type || !body.dayOfMonth) {
    return NextResponse.json({ error: "amount, type, and dayOfMonth are required" }, { status: 400 });
  }

  const item = await prisma.recurringTransaction.create({
    data: {
      userId: auth.userId,
      amount: body.amount,
      type: body.type as "income" | "expense",
      categoryId: body.categoryId || null,
      description: body.description || null,
      notes: body.notes || null,
      dayOfMonth: Math.min(28, Math.max(1, body.dayOfMonth)),
    },
    include: { category: true },
  });

  return NextResponse.json(serialize(item), { status: 201 });
}
