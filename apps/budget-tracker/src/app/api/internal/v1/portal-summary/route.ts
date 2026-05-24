import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";
import { computeFiNumber, computeFireScore } from "@/lib/fireCalc";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// MTD spend (one-time + recurring), total monthly budget (MonthlyBudget
// overrides + Category.monthlyBudget defaults), and FIRE % from FIREProfile +
// current investable assets. Also returns the over-budget category list
// (>= 80% spent), consumed by portal's Today inbox.

const OVER_BUDGET_THRESHOLD = 0.8;
const OVER_BUDGET_LIMIT = 10;
export async function GET(request: Request) {
  if (!validateInternalApiKey(request)) {
    return internalError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  if (!userId && !email) {
    return internalError("userId or email is required", 400);
  }

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const user = await authPrisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return internalResponse({
        mtdSpent: 0,
        monthlyBudgetTotal: 0,
        remaining: 0,
        fireScorePct: null,
        overBudgetCategories: [],
        mtdTopCategories: [],
      });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  try {
    const [
      transactions,
      recurring,
      categories,
      monthlyBudgets,
      investments,
      fireProfile,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: resolvedUserId!,
          type: "expense",
          date: { gte: start, lt: end },
        },
        select: { amount: true, categoryId: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId: resolvedUserId!, type: "expense", isActive: true },
        select: { amount: true, categoryId: true },
      }),
      prisma.category.findMany({
        where: { userId: resolvedUserId! },
        select: {
          id: true,
          name: true,
          color: true,
          monthlyBudget: true,
          isSavings: true,
          type: true,
        },
      }),
      prisma.monthlyBudget.findMany({
        where: { userId: resolvedUserId!, year, month },
        select: { categoryId: true, budgetAmount: true },
      }),
      prisma.investment.findMany({
        where: { userId: resolvedUserId! },
        select: { currentValue: true },
      }),
      prisma.fIREProfile.findUnique({
        where: { userId: resolvedUserId! },
      }),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const spentByCategory = new Map<string, number>();

    let mtdSpent = 0;
    for (const t of transactions) {
      const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
      if (cat?.isSavings) continue;
      const amt = Number(t.amount);
      mtdSpent += amt;
      if (t.categoryId) {
        spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + amt);
      }
    }
    for (const r of recurring) {
      const cat = r.categoryId ? categoryMap.get(r.categoryId) : null;
      if (cat?.isSavings) continue;
      const amt = Number(r.amount);
      mtdSpent += amt;
      if (r.categoryId) {
        spentByCategory.set(r.categoryId, (spentByCategory.get(r.categoryId) ?? 0) + amt);
      }
    }

    const overrideMap = new Map(
      monthlyBudgets.map((b) => [b.categoryId, Number(b.budgetAmount)]),
    );
    let monthlyBudgetTotal = 0;
    const overBudgetCategories: {
      id: string;
      name: string;
      spent: number;
      budget: number;
      pct: number;
    }[] = [];
    for (const cat of categories) {
      if (cat.type !== "expense" || cat.isSavings) continue;
      const override = overrideMap.get(cat.id);
      const defaultBudget = cat.monthlyBudget != null ? Number(cat.monthlyBudget) : 0;
      const budget = override ?? defaultBudget;
      monthlyBudgetTotal += budget;
      if (budget <= 0) continue;
      const spent = spentByCategory.get(cat.id) ?? 0;
      const pct = spent / budget;
      if (pct >= OVER_BUDGET_THRESHOLD) {
        overBudgetCategories.push({ id: cat.id, name: cat.name, spent, budget, pct });
      }
    }
    overBudgetCategories.sort((a, b) => b.pct - a.pct);
    overBudgetCategories.splice(OVER_BUDGET_LIMIT);

    let fireScorePct: number | null = null;
    if (fireProfile) {
      const fiNumber = computeFiNumber(
        Number(fireProfile.targetAnnualExpenses),
        Number(fireProfile.safeWithdrawalRate),
      );
      const investableAssets = investments.reduce(
        (sum, inv) => sum + Number(inv.currentValue),
        0,
      );
      fireScorePct = computeFireScore(investableAssets, fiNumber);
    }

    // Top spending categories for the Dashboard's "what makes up Personal
    // Spend?" window. Sorted by amount desc, capped at 5.
    const mtdTopCategories = Array.from(spentByCategory.entries())
      .map(([id, amount]) => {
        const cat = categoryMap.get(id);
        return {
          id,
          name: cat?.name ?? "Uncategorized",
          color: cat?.color ?? null,
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return internalResponse({
      mtdSpent,
      monthlyBudgetTotal,
      remaining: monthlyBudgetTotal - mtdSpent,
      fireScorePct,
      overBudgetCategories,
      mtdTopCategories,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
