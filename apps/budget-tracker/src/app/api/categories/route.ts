import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/data/defaultCategories";

function serializeCategory(c: {
  id: string; userId: string; name: string; color: string; icon: string;
  type: string; monthlyBudget: { toNumber: () => number } | null; isDefault: boolean;
  order: number; createdAt: Date; updatedAt: Date;
}) {
  return {
    ...c,
    monthlyBudget: c.monthlyBudget ? c.monthlyBudget.toNumber() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const existing = await prisma.category.findMany({
    where: { userId: auth.userId },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  // First-time user: auto-seed default categories so they don't start from scratch
  if (existing.length === 0) {
    const defaults = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, userId: auth.userId, isDefault: true, order: i })),
      ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ ...c, userId: auth.userId, isDefault: true, order: i })),
    ];
    await prisma.category.createMany({ data: defaults, skipDuplicates: true });

    const seeded = await prisma.category.findMany({
      where: { userId: auth.userId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(seeded.map(serializeCategory));
  }

  return NextResponse.json(existing.map(serializeCategory));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    name: string; color: string; icon: string; type: string; monthlyBudget?: number | null;
  };
  const { name, color, icon, type, monthlyBudget } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      userId: auth.userId,
      name: name.trim(),
      color: color || "#6366f1",
      icon: icon || "tag",
      type: type as "income" | "expense" | "both",
      monthlyBudget: monthlyBudget ?? null,
      isDefault: false,
    },
  });

  return NextResponse.json(serializeCategory(category), { status: 201 });
}
