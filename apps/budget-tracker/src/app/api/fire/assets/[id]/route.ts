import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await req.json() as { name?: string; type?: string; value?: number; notes?: string | null };
  const existing = await prisma.btAsset.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.btAsset.update({ where: { id }, data: { name: body.name ?? existing.name, type: (body.type as "real_estate" | "vehicle" | "cash" | "other") ?? existing.type, value: body.value ?? existing.value, notes: body.notes !== undefined ? body.notes : existing.notes } });
  return NextResponse.json({ ...updated, value: updated.value.toNumber(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.btAsset.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.btAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
