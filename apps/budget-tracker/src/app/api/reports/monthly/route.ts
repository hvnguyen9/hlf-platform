import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "") || new Date().getFullYear();

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: auth.userId, isActive: true },
  });
  const recurringIncome = recurring
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount.toNumber(), 0);
  const recurringExpenses = recurring
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount.toNumber(), 0);

  const results = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1;
      const start = new Date(year, i, 1);
      const end = new Date(year, i + 1, 1);

      const rows = await prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: auth.userId, date: { gte: start, lt: end } },
        _sum: { amount: true },
      });

      const income =
        (rows.find((r) => r.type === "income")?._sum.amount?.toNumber() ?? 0) + recurringIncome;
      const expenses =
        (rows.find((r) => r.type === "expense")?._sum.amount?.toNumber() ?? 0) + recurringExpenses;
      const savings = income - expenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;

      return { month, year, label: format(start, "MMM"), income, expenses, savings, savingsRate };
    })
  );

  return NextResponse.json(results);
}
