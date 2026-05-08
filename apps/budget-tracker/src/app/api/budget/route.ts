import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || "");

  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [categories, monthlyBudgets, transactions, recurringExpenses] = await Promise.all([
    prisma.category.findMany({
      where: { userId: auth.userId, type: { in: ["expense", "both"] } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.monthlyBudget.findMany({
      where: { userId: auth.userId, year, month },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: auth.userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    // Recurring expenses always count toward the month
    prisma.recurringTransaction.findMany({
      where: { userId: auth.userId, type: "expense", isActive: true },
    }),
  ]);

  // Merge actual + recurring into spending per category
  const actualByCategory = new Map<string, number>();

  for (const t of transactions) {
    if (t.categoryId) {
      actualByCategory.set(t.categoryId, (actualByCategory.get(t.categoryId) ?? 0) + (t._sum.amount?.toNumber() ?? 0));
    }
  }
  for (const r of recurringExpenses) {
    if (r.categoryId) {
      actualByCategory.set(r.categoryId, (actualByCategory.get(r.categoryId) ?? 0) + r.amount.toNumber());
    }
  }

  const budgetOverrides = new Map(
    monthlyBudgets.map((b) => [b.categoryId, { id: b.id, amount: b.budgetAmount.toNumber() }])
  );

  const result = categories
    .map((c) => {
      const override = budgetOverrides.get(c.id);
      const budgetAmount = override?.amount ?? c.monthlyBudget?.toNumber() ?? 0;
      const actualAmount = actualByCategory.get(c.id) ?? 0;
      return {
        categoryId: c.id,
        categoryName: c.name,
        color: c.color,
        icon: c.icon,
        budgetAmount,
        actualAmount,
        remaining: budgetAmount - actualAmount,
        monthlyBudgetId: override?.id ?? null,
      };
    });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    categoryId: string; year: number; month: number; budgetAmount: number;
  };
  const { categoryId, year, month, budgetAmount } = body;

  if (!categoryId || !year || !month || budgetAmount === undefined) {
    return NextResponse.json({ error: "categoryId, year, month, budgetAmount required" }, { status: 400 });
  }

  const record = await prisma.monthlyBudget.upsert({
    where: { userId_year_month_categoryId: { userId: auth.userId, year, month, categoryId } },
    update: { budgetAmount },
    create: { userId: auth.userId, categoryId, year, month, budgetAmount },
  });

  return NextResponse.json({
    ...record,
    budgetAmount: record.budgetAmount.toNumber(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}
