import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

function serialize(a: { id: string; userId: string; name: string; type: string; value: { toNumber: () => number }; notes: string | null; createdAt: Date; updatedAt: Date }) {
  return { ...a, value: a.value.toNumber(), createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const assets = await prisma.btAsset.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(assets.map(serialize));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json() as { name: string; type: string; value: number; notes?: string };
  const asset = await prisma.btAsset.create({
    data: { userId: auth.userId, name: body.name, type: body.type as "real_estate" | "vehicle" | "cash" | "other", value: body.value, notes: body.notes || null },
  });
  return NextResponse.json(serialize(asset), { status: 201 });
}
