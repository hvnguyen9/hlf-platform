import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(p: {
  userId: string; targetAnnualExpenses: { toNumber: () => number };
  safeWithdrawalRate: { toNumber: () => number }; targetRetirementAge: number | null;
  currentAge: number | null; expectedReturn: { toNumber: () => number };
  wheelMonthlyRate: { toNumber: () => number }; additionalRetirementSpend: { toNumber: () => number };
  createdAt: Date; updatedAt: Date;
}) {
  return {
    ...p,
    targetAnnualExpenses: p.targetAnnualExpenses.toNumber(),
    safeWithdrawalRate: p.safeWithdrawalRate.toNumber(),
    expectedReturn: p.expectedReturn.toNumber(),
    wheelMonthlyRate: p.wheelMonthlyRate.toNumber(),
    additionalRetirementSpend: p.additionalRetirementSpend.toNumber(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const [profile, categories, recurring] = await Promise.all([
    prisma.fIREProfile.findUnique({ where: { userId: auth.userId } }),
    prisma.category.findMany({ where: { userId: auth.userId, monthlyBudget: { not: null } } }),
    prisma.recurringTransaction.findMany({ where: { userId: auth.userId, type: "expense", isActive: true } }),
  ]);

  // Budget-derived minimum annual spend
  const budgetMonthly = categories.reduce((s, c) => s + (c.monthlyBudget?.toNumber() ?? 0), 0);
  const recurringMonthly = recurring.reduce((s, r) => s + r.amount.toNumber(), 0);
  const minAnnualSpend = Math.max(budgetMonthly, recurringMonthly) * 12;

  return NextResponse.json({
    profile: profile ? serialize(profile) : null,
    minAnnualSpend,
    budgetMonthly,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    targetAnnualExpenses: number; safeWithdrawalRate: number;
    targetRetirementAge?: number | null; currentAge?: number | null;
    expectedReturn: number; wheelMonthlyRate: number; additionalRetirementSpend: number;
  };

  const profile = await prisma.fIREProfile.upsert({
    where: { userId: auth.userId },
    update: {
      targetAnnualExpenses: body.targetAnnualExpenses,
      safeWithdrawalRate: body.safeWithdrawalRate,
      targetRetirementAge: body.targetRetirementAge ?? null,
      currentAge: body.currentAge ?? null,
      expectedReturn: body.expectedReturn,
      wheelMonthlyRate: body.wheelMonthlyRate,
      additionalRetirementSpend: body.additionalRetirementSpend,
    },
    create: {
      userId: auth.userId,
      targetAnnualExpenses: body.targetAnnualExpenses,
      safeWithdrawalRate: body.safeWithdrawalRate,
      targetRetirementAge: body.targetRetirementAge ?? null,
      currentAge: body.currentAge ?? null,
      expectedReturn: body.expectedReturn,
      wheelMonthlyRate: body.wheelMonthlyRate,
      additionalRetirementSpend: body.additionalRetirementSpend,
    },
  });

  return NextResponse.json(serialize(profile));
}
