import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || "") || now.getFullYear();
  const month = parseInt(searchParams.get("month") || "") || now.getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [transactions, recurring, categories, monthlyBudgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: auth.userId, date: { gte: start, lt: end } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: auth.userId, isActive: true },
      include: { category: true },
    }),
    prisma.category.findMany({ where: { userId: auth.userId } }),
    prisma.monthlyBudget.findMany({ where: { userId: auth.userId, year, month } }),
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSavings = 0;
  const spendingMap = new Map<string, number>();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // One-time transactions
  for (const t of transactions) {
    const amount = t.amount.toNumber();
    if (t.type === "income") {
      totalIncome += amount;
    } else {
      const isSavings = t.categoryId ? (categoryMap.get(t.categoryId)?.isSavings ?? false) : false;
      if (isSavings) {
        totalSavings += amount;
      } else {
        totalExpenses += amount;
      }
      if (t.categoryId) spendingMap.set(t.categoryId, (spendingMap.get(t.categoryId) ?? 0) + amount);
    }
  }

  // Recurring transactions — always included for the month
  for (const r of recurring) {
    const amount = r.amount.toNumber();
    if (r.type === "income") {
      totalIncome += amount;
    } else {
      const isSavings = r.categoryId ? (categoryMap.get(r.categoryId)?.isSavings ?? false) : false;
      if (isSavings) {
        totalSavings += amount;
      } else {
        totalExpenses += amount;
      }
      if (r.categoryId) spendingMap.set(r.categoryId, (spendingMap.get(r.categoryId) ?? 0) + amount);
    }
  }

  // netSavings: what to show on the "Saved" card — uses savings categories if set,
  // falls back to income-minus-expenses when none are configured yet
  const netSavings = totalSavings > 0
    ? totalSavings
    : Math.max(0, totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  // available: unallocated money = income - spending - intentional savings
  const available = totalIncome - totalExpenses - totalSavings;

  const spendingByCategory = Array.from(spendingMap.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryMap.get(categoryId)?.name ?? "Uncategorized",
      color: categoryMap.get(categoryId)?.color ?? "#94a3b8",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Last 12 months trend — only months with actual data, never future months
  const today = new Date();
  const recurringIncome = recurring.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount.toNumber(), 0);
  const recurringExpenses = recurring.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount.toNumber(), 0);

  const trendMonths = await Promise.all(
    Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(year, month - 1, 1), 11 - i);
      const s = startOfMonth(d);
      const e = endOfMonth(d);

      // Skip future months entirely
      if (s > today) return Promise.resolve(null);

      return prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: auth.userId, date: { gte: s, lte: e } },
        _sum: { amount: true },
      }).then((rows) => {
        const oneTimeIncome = rows.find((r) => r.type === "income")?._sum.amount?.toNumber() ?? 0;
        const oneTimeExpenses = rows.find((r) => r.type === "expense")?._sum.amount?.toNumber() ?? 0;

        // Drop months with no data at all
        const hasData = oneTimeIncome > 0 || oneTimeExpenses > 0 || recurringIncome > 0 || recurringExpenses > 0;
        if (!hasData) return null;

        return {
          month: format(s, "MMM yy"),
          income: oneTimeIncome + recurringIncome,
          expenses: oneTimeExpenses + recurringExpenses,
        };
      });
    })
  );

  const monthlyTrend = trendMonths.filter(Boolean) as { month: string; income: number; expenses: number }[];

  // Budget progress (recurring counts toward actuals)
  const budgetOverrides = new Map(monthlyBudgets.map((b) => [b.categoryId, b.budgetAmount.toNumber()]));
  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both");
  const budgetProgress = expenseCategories
    .map((c) => {
      const budgeted = budgetOverrides.get(c.id) ?? c.monthlyBudget?.toNumber() ?? 0;
      const actual = spendingMap.get(c.id) ?? 0;
      if (budgeted === 0 && actual === 0) return null;
      return { categoryId: c.id, name: c.name, color: c.color, budgeted, actual };
    })
    .filter(Boolean) as { categoryId: string; name: string; color: string; budgeted: number; actual: number }[];

  // Recent: merge one-time + recurring, sort by date desc, take 10
  const maxDay = new Date(year, month, 0).getDate();
  const virtualRecurring = recurring.map((r) => ({
    id: `recurring-${r.id}`,
    userId: r.userId,
    amount: r.amount.toNumber(),
    type: r.type,
    categoryId: r.categoryId,
    category: r.category ? {
      ...r.category,
      monthlyBudget: r.category.monthlyBudget ? r.category.monthlyBudget.toNumber() : null,
      createdAt: r.category.createdAt.toISOString(),
      updatedAt: r.category.updatedAt.toISOString(),
    } : null,
    description: r.description,
    notes: r.notes,
    date: new Date(year, month - 1, Math.min(r.dayOfMonth, maxDay)).toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isRecurring: true,
    recurringId: r.id,
  }));

  const allTxs = [
    ...transactions.map((t) => ({
      ...t,
      amount: t.amount.toNumber(),
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      category: t.category ? {
        ...t.category,
        monthlyBudget: t.category.monthlyBudget ? t.category.monthlyBudget.toNumber() : null,
        createdAt: t.category.createdAt.toISOString(),
        updatedAt: t.category.updatedAt.toISOString(),
      } : null,
    })),
    ...virtualRecurring,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    totalSavings: netSavings,
    available,
    spendingByCategory,
    monthlyTrend,
    budgetProgress,
    recentTransactions: allTxs.slice(0, 10),
  });
}
