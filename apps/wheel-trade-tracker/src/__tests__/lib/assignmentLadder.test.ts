import { describe, it, expect } from "vitest";
import { buildAssignmentLadder, type LadderCsp } from "@/lib/assignmentLadder";

const csp = (over: Partial<LadderCsp>): LadderCsp => ({
  id: Math.random().toString(36).slice(2),
  ticker: "AAA",
  strikePrice: 100,
  contractsOpen: 1,
  expirationDate: "2026-06-26",
  collateral: 10_000,
  ...over,
});

describe("buildAssignmentLadder", () => {
  it("baseline is currentCapital minus committed", () => {
    const r = buildAssignmentLadder({ currentCapital: 120_000, committed: 45_000, csps: [] });
    expect(r.baseline).toBe(75_000);
    expect(r.rows).toHaveLength(0);
    expect(r.totalReserved).toBe(0);
    expect(r.endFree).toBe(75_000);
    expect(r.breachDate).toBeNull();
  });

  it("groups CSPs by expiration and walks free cash down in date order", () => {
    const r = buildAssignmentLadder({
      currentCapital: 120_000,
      committed: 0,
      csps: [
        csp({ ticker: "MSFT", expirationDate: "2026-07-02", collateral: 28_000 }),
        csp({ ticker: "F", expirationDate: "2026-06-26", collateral: 6_000 }),
        csp({ ticker: "AMD", expirationDate: "2026-06-26", collateral: 14_000 }),
      ],
    });
    expect(r.rows.map((x) => x.date)).toEqual(["2026-06-26", "2026-07-02"]);
    expect(r.rows[0].deploys).toBe(20_000);
    expect(r.rows[0].freeAfter).toBe(100_000);
    expect(r.rows[1].cumulativeDeployed).toBe(48_000);
    expect(r.rows[1].freeAfter).toBe(72_000);
    expect(r.totalReserved).toBe(48_000);
    expect(r.breachDate).toBeNull();
    // positions within a date sorted by collateral desc
    expect(r.rows[0].positions[0].ticker).toBe("AMD");
  });

  it("flags the first date liquid cash goes negative", () => {
    const r = buildAssignmentLadder({
      currentCapital: 30_000,
      committed: 0,
      csps: [
        csp({ expirationDate: "2026-06-26", collateral: 20_000 }),
        csp({ expirationDate: "2026-07-02", collateral: 20_000 }),
      ],
    });
    expect(r.rows[0].breached).toBe(false);
    expect(r.rows[1].breached).toBe(true);
    expect(r.breachDate).toBe("2026-07-02");
    expect(r.endFree).toBe(-10_000);
  });

  it("resolves ITM per position via itmFor", () => {
    const r = buildAssignmentLadder({
      currentCapital: 100_000,
      committed: 0,
      csps: [csp({ ticker: "NVDA", strikePrice: 120 })],
      itmFor: (c) => c.strikePrice > 100, // pretend price is 100
    });
    expect(r.rows[0].positions[0].itm).toBe(true);
  });
});
