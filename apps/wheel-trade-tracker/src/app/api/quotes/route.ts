import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { getQuoteSnapshots, type QuoteSnapshot } from "@/lib/alpaca";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// QuoteResult is the historical shape returned to the watchlist UI. Keeping
// the export name so existing consumers don't need import changes.
export type QuoteResult = QuoteSnapshot;

export async function GET(request: Request) {
  const { user } = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = [
    ...new Set(
      tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    ),
  ].slice(0, 25);

  if (tickers.length === 0) return NextResponse.json({});

  const results = await getQuoteSnapshots(tickers);
  const map: Record<string, QuoteResult> = {};
  for (const r of results) map[r.ticker] = r;

  return NextResponse.json(map, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
