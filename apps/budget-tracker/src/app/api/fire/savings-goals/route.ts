import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(g: {
  id: string; userId: string; name: string;
  targetAmount: { toNumber: () => number }; currentAmount: { toNumber: () => number };
  deadline: Date | null; description: string | null; isCompleted: boolean;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    ...g,
    targetAmount: g.targetAmount.toNumber(),
    currentAmount: g.currentAmount.toNumber(),
    deadline: g.deadline ? g.deadline.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: auth.userId },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(goals.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    name: string; targetAmount: number; currentAmount?: number;
    deadline?: string | null; description?: string;
  };

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: auth.userId,
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount ?? 0,
      deadline: body.deadline ? new Date(body.deadline) : null,
      description: body.description || null,
    },
  });

  return NextResponse.json(serialize(goal), { status: 201 });
}
