import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSession } from "../../helpers/mocks";

const { mockGetServerSession, mockGetQuoteSnapshots } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockGetQuoteSnapshots: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/server/auth/auth", () => ({ authOptions: {}, auth: mockGetServerSession }));
vi.mock("@/lib/alpaca", () => ({
  getQuoteSnapshots: mockGetQuoteSnapshots,
}));

import { GET } from "@/app/api/quotes/route";

function snapshot(ticker: string, price: number | null, prev: number | null) {
  const change = price !== null && prev !== null ? price - prev : null;
  const changePct = change !== null && prev ? (change / prev) * 100 : null;
  return {
    ticker,
    price,
    change,
    changePct,
    previousClose: prev,
    marketState: "REGULAR" as const,
    volume: price !== null ? 1_000_000 : null,
    dayHigh: price !== null ? price + 2 : null,
    dayLow: price !== null ? price - 2 : null,
    fiftyTwoWeekHigh: price !== null ? price + 50 : null,
    fiftyTwoWeekLow: price !== null ? price - 50 : null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue(mockSession());
  mockGetQuoteSnapshots.mockImplementation(async (tickers: string[]) =>
    tickers.map((t) => snapshot(t, 150, 145)),
  );
});

describe("GET /api/quotes", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/quotes?tickers=AAPL"));
    expect(res.status).toBe(401);
  });

  it("returns empty object when no tickers provided", async () => {
    const res = await GET(new Request("http://localhost/api/quotes?tickers="));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it("returns quote data for valid ticker", async () => {
    const res = await GET(new Request("http://localhost/api/quotes?tickers=AAPL"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, { price: number; change: number }>;
    expect(body.AAPL.price).toBe(150);
    expect(body.AAPL.change).toBeCloseTo(5, 2);
  });

  it("returns null result when snapshot has no data", async () => {
    mockGetQuoteSnapshots.mockResolvedValueOnce([snapshot("BAD", null, null)]);
    const res = await GET(new Request("http://localhost/api/quotes?tickers=BAD"));
    const body = (await res.json()) as Record<string, { price: null }>;
    expect(body.BAD.price).toBeNull();
  });

  it("normalizes tickers to uppercase and deduplicates", async () => {
    const res = await GET(new Request("http://localhost/api/quotes?tickers=aapl,AAPL,msft"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
    expect(Object.keys(body)).toHaveLength(2);
    // Verify we passed deduped uppercase tickers to the lib
    const call = mockGetQuoteSnapshots.mock.calls[0]?.[0] as string[];
    expect(call).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
    expect(call).toHaveLength(2);
  });

  it("caps batch requests at 25 tickers", async () => {
    const tickers = Array.from({ length: 30 }, (_, i) => `T${i}`).join(",");
    const res = await GET(new Request(`http://localhost/api/quotes?tickers=${tickers}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toHaveLength(25);
    const call = mockGetQuoteSnapshots.mock.calls[0]?.[0] as string[];
    expect(call).toHaveLength(25);
  });
});
