import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { prisma } from "@/server/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticker } = await params;
  await prisma.watchlistItem.deleteMany({
    where: { userId: user.id, ticker: ticker.toUpperCase() },
  });

  return NextResponse.json({ ok: true });
}
