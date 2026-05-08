import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await req.json() as { name?: string; type?: string; balance?: number; notes?: string | null };
  const existing = await prisma.btLiability.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.btLiability.update({ where: { id }, data: { name: body.name ?? existing.name, type: (body.type as "mortgage" | "car_loan" | "student_loan" | "credit_card" | "other") ?? existing.type, balance: body.balance ?? existing.balance, notes: body.notes !== undefined ? body.notes : existing.notes } });
  return NextResponse.json({ ...updated, balance: updated.balance.toNumber(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.btLiability.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.btLiability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
