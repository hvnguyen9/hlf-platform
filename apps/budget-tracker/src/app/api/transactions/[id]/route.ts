import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as {
    amount?: number; type?: string; categoryId?: string | null;
    description?: string | null; notes?: string | null; date?: string;
  };

  const existing = await prisma.transaction.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      amount: body.amount ?? existing.amount,
      type: (body.type as "income" | "expense") ?? existing.type,
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      description: body.description !== undefined ? body.description : existing.description,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      date: body.date ? new Date(body.date) : existing.date,
    },
    include: { category: true },
  });

  return NextResponse.json({
    ...updated,
    amount: updated.amount.toNumber(),
    date: updated.date.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    category: updated.category ? {
      ...updated.category,
      monthlyBudget: updated.category.monthlyBudget ? updated.category.monthlyBudget.toNumber() : null,
      createdAt: updated.category.createdAt.toISOString(),
      updatedAt: updated.category.updatedAt.toISOString(),
    } : null,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.transaction.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
