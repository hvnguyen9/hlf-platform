import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

// Month-at-a-glance summary. Builds a narrative money flow for one month:
//   income → expenses (by category, incl. recurring) → savings → surplus.
// Recurring transactions are always counted toward the month.

type Line = {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
  recurring: number;
};

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
      select: { amount: true, type: true, categoryId: true },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: auth.userId, isActive: true },
      select: { amount: true, type: true, categoryId: true },
    }),
    prisma.category.findMany({ where: { userId: auth.userId } }),
    prisma.monthlyBudget.findMany({ where: { userId: auth.userId, year, month } }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const UNCATEGORIZED = { name: "Uncategorized", color: "#94a3b8" };

  // Three buckets keyed by categoryId (or "__none__" for uncategorized).
  const expenseLines = new Map<string, Line>();
  const savingsLines = new Map<string, Line>();
  const incomeLines = new Map<string, Line>();

  function add(map: Map<string, Line>, categoryId: string | null, amount: number, isRecurring: boolean) {
    const key = categoryId ?? "__none__";
    const cat = categoryId ? categoryMap.get(categoryId) : undefined;
    const line = map.get(key) ?? {
      categoryId,
      name: cat?.name ?? UNCATEGORIZED.name,
      color: cat?.color ?? UNCATEGORIZED.color,
      total: 0,
      recurring: 0,
    };
    line.total += amount;
    if (isRecurring) line.recurring += amount;
    map.set(key, line);
  }

  function route(categoryId: string | null, type: string, amount: number, isRecurring: boolean) {
    if (type === "income") {
      add(incomeLines, categoryId, amount, isRecurring);
      return;
    }
    const isSavings = categoryId ? (categoryMap.get(categoryId)?.isSavings ?? false) : false;
    add(isSavings ? savingsLines : expenseLines, categoryId, amount, isRecurring);
  }

  for (const t of transactions) route(t.categoryId, t.type, t.amount.toNumber(), false);
  for (const r of recurring) route(r.categoryId, r.type, r.amount.toNumber(), true);

  // Budgets per expense category (monthly override → standing default).
  const budgetOverrides = new Map(monthlyBudgets.map((b) => [b.categoryId, b.budgetAmount.toNumber()]));
  function budgetFor(categoryId: string | null): number {
    if (!categoryId) return 0;
    return budgetOverrides.get(categoryId) ?? categoryMap.get(categoryId)?.monthlyBudget?.toNumber() ?? 0;
  }

  // Include budgeted-but-unspent expense categories so the plan is visible.
  const expenseCategories = categories.filter((c) => (c.type === "expense" || c.type === "both") && !c.isSavings);
  for (const c of expenseCategories) {
    if (budgetFor(c.id) > 0 && !expenseLines.has(c.id)) {
      expenseLines.set(c.id, { categoryId: c.id, name: c.name, color: c.color, total: 0, recurring: 0 });
    }
  }

  const sortDesc = <T extends { total: number }>(a: T, b: T) => b.total - a.total;

  const expenseBreakdown = Array.from(expenseLines.values())
    .map((l) => ({ ...l, budget: budgetFor(l.categoryId) }))
    .sort(sortDesc);
  const savingsBreakdown = Array.from(savingsLines.values()).sort(sortDesc);
  const incomeBreakdown = Array.from(incomeLines.values()).sort(sortDesc);

  const totalIncome = incomeBreakdown.reduce((s, l) => s + l.total, 0);
  const totalExpenses = expenseBreakdown.reduce((s, l) => s + l.total, 0);
  const totalSavings = savingsBreakdown.reduce((s, l) => s + l.total, 0);
  const totalBudget = expenseBreakdown.reduce((s, l) => s + l.budget, 0);
  const surplus = totalIncome - totalExpenses - totalSavings;

  return NextResponse.json({
    year,
    month,
    totalIncome,
    totalExpenses,
    totalSavings,
    totalBudget,
    surplus,
    expenseBreakdown,
    incomeBreakdown,
    savingsBreakdown,
  });
}
