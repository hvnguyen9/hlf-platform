import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as {
    name?: string; type?: string; currentValue?: number; notes?: string | null; isWheelAccount?: boolean;
  };

  const existing = await prisma.investment.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      type: (body.type as "brokerage" | "retirement_401k" | "IRA" | "roth_IRA" | "crypto" | "real_estate" | "other") ?? existing.type,
      currentValue: body.currentValue ?? existing.currentValue,
      isWheelAccount: body.isWheelAccount ?? existing.isWheelAccount,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      lastUpdated: new Date(),
    },
  });

  return NextResponse.json({
    ...updated,
    currentValue: updated.currentValue.toNumber(),
    lastUpdated: updated.lastUpdated.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.investment.findFirst({ where: { id, userId: auth.userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.investment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
