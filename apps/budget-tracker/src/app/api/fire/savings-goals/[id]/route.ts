import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as {
    name?: string; targetAmount?: number; currentAmount?: number;
    deadline?: string | null; description?: string | null; isCompleted?: boolean;
  };

  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      targetAmount: body.targetAmount ?? existing.targetAmount,
      currentAmount: body.currentAmount ?? existing.currentAmount,
      deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : existing.deadline,
      description: body.description !== undefined ? body.description : existing.description,
      isCompleted: body.isCompleted ?? existing.isCompleted,
    },
  });

  return NextResponse.json({
    ...updated,
    targetAmount: updated.targetAmount.toNumber(),
    currentAmount: updated.currentAmount.toNumber(),
    deadline: updated.deadline ? updated.deadline.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
