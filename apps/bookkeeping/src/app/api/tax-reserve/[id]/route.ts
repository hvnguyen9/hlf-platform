import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

type DbEntry = Awaited<ReturnType<typeof prisma.taxReserveEntry.findFirst>>;

function serialize(e: NonNullable<DbEntry>) {
  return {
    ...e,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.taxReserveEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as {
    date?: string;
    amount?: number;
    kind?: "parked" | "paid";
    quarter?: number | null;
    note?: string | null;
  };

  const entry = await prisma.taxReserveEntry.update({
    where: { id },
    data: {
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.kind !== undefined && { kind: body.kind }),
      ...(body.quarter !== undefined && { quarter: body.quarter }),
      ...(body.note !== undefined && { note: body.note?.trim() || null }),
    },
  });

  return NextResponse.json(serialize(entry));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.taxReserveEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.taxReserveEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
