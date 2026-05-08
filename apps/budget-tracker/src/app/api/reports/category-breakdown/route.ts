import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "") || new Date().getFullYear();
  const type = searchParams.get("type") === "income" ? "income" : "expense";

  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const [grouped, recurring, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: auth.userId, type, date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    // Recurring items contribute their monthly amount × 12 for a full year view
    prisma.recurringTransaction.findMany({
      where: { userId: auth.userId, type, isActive: true },
    }),
    prisma.category.findMany({ where: { userId: auth.userId } }),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Build totals map from one-time transactions
  const totals = new Map<string | null, number>();
  for (const g of grouped) {
    totals.set(g.categoryId, (totals.get(g.categoryId) ?? 0) + (g._sum.amount?.toNumber() ?? 0));
  }

  // Add recurring annual contribution (amount × 12)
  for (const r of recurring) {
    const key = r.categoryId;
    totals.set(key, (totals.get(key) ?? 0) + r.amount.toNumber() * 12);
  }

  const result = Array.from(totals.entries())
    .map(([categoryId, total]) => {
      const cat = categoryId ? catMap.get(categoryId) : null;
      return {
        categoryId,
        name: cat?.name ?? "Uncategorized",
        color: cat?.color ?? "#94a3b8",
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  return NextResponse.json(result);
}
