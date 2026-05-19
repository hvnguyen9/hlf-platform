import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import prisma from "@/server/prisma";

export async function GET(request: Request) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

  // Toast poller uses ?since= to only ask for events newer than what it's
  // already shown. Invalid timestamps fall through to "no since filter".
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const sinceFilter = since && !Number.isNaN(since.getTime()) ? { gt: since } : undefined;

  const events = await prisma.alertEvent.findMany({
    where: {
      userId: user.id,
      ...(sinceFilter ? { firedAt: sinceFilter } : {}),
    },
    orderBy: { firedAt: "desc" },
    take,
    include: {
      config: {
        select: {
          id: true,
          type: true,
          tradeId: true,
          watchlistTicker: true,
        },
      },
    },
  });
  return NextResponse.json({ events });
}
