import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as {
    name?: string; color?: string; icon?: string; type?: string;
    monthlyBudget?: number | null; isSavings?: boolean;
  };

  const existing = await prisma.category.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? existing.name,
      color: body.color ?? existing.color,
      icon: body.icon ?? existing.icon,
      type: (body.type as "income" | "expense" | "both") ?? existing.type,
      monthlyBudget: body.monthlyBudget !== undefined ? body.monthlyBudget : existing.monthlyBudget,
      isSavings: body.isSavings ?? existing.isSavings,
    },
  });

  return NextResponse.json({
    ...updated,
    monthlyBudget: updated.monthlyBudget ? updated.monthlyBudget.toNumber() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.category.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
