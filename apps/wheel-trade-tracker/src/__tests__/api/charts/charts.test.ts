import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSession } from "../../helpers/mocks";

const { mockGetServerSession, mockGetIntradayBars } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockGetIntradayBars: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/server/auth/auth", () => ({ authOptions: {}, auth: mockGetServerSession }));
vi.mock("@/lib/alpaca", () => ({
  getIntradayBars: mockGetIntradayBars,
}));

import { GET } from "@/app/api/charts/route";

function series(closes: number[]) {
  const base = Math.floor(Date.now() / 1000);
  return {
    closes,
    timestamps: closes.map((_, i) => base + i * 300),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue(mockSession());
  mockGetIntradayBars.mockImplementation(async (tickers: string[]) => {
    const out = new Map<string, { closes: number[]; timestamps: number[] }>();
    for (const t of tickers) out.set(t, series([100, 101, 102, 103, 104]));
    return out;
  });
});

describe("GET /api/charts", () => {
  it("returns 401 when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/charts?tickers=AAPL"));
    expect(res.status).toBe(401);
  });

  it("returns empty object when no tickers provided", async () => {
    const res = await GET(new Request("http://localhost/api/charts?tickers="));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it("returns closes array for a ticker with intraday data", async () => {
    const res = await GET(new Request("http://localhost/api/charts?tickers=AAPL"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, { closes: number[] }>;
    expect(body.AAPL.closes).toEqual([100, 101, 102, 103, 104]);
  });

  it("returns empty series when the lib has no data for a ticker", async () => {
    mockGetIntradayBars.mockResolvedValueOnce(new Map());
    const res = await GET(new Request("http://localhost/api/charts?tickers=ZZZ"));
    const body = (await res.json()) as Record<string, { closes: number[]; timestamps: number[] }>;
    expect(body.ZZZ).toEqual({ closes: [], timestamps: [] });
  });

  it("normalizes tickers to uppercase and deduplicates", async () => {
    const res = await GET(new Request("http://localhost/api/charts?tickers=aapl,AAPL,msft"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
    expect(Object.keys(body)).toHaveLength(2);
    const call = mockGetIntradayBars.mock.calls[0]?.[0] as string[];
    expect(call).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
    expect(call).toHaveLength(2);
  });

  it("caps batch requests at 25 tickers", async () => {
    const tickers = Array.from({ length: 30 }, (_, i) => `T${i}`).join(",");
    const res = await GET(new Request(`http://localhost/api/charts?tickers=${tickers}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toHaveLength(25);
    const call = mockGetIntradayBars.mock.calls[0]?.[0] as string[];
    expect(call).toHaveLength(25);
  });
});
