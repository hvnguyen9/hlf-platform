import { describe, it, expect } from "vitest";
import { projectPmccBasis } from "@/lib/pmccBasis";

describe("projectPmccBasis", () => {
  it("reduces effective cost by realized CC premium", () => {
    // 1 LEAP bought at $20.00/sh → $2,000 cost. $350 captured from closed CCs.
    const b = projectPmccBasis({
      strikePrice: 150,
      contractPrice: 20,
      contracts: 1,
      realizedPremium: 350,
      openCcContracts: 0,
      openCcCount: 0,
      closedCcCount: 2,
    });
    expect(b.originalCost).toBe(2000);
    expect(b.effectiveCost).toBe(1650);
    expect(b.effectiveCostPerShare).toBeCloseTo(16.5, 5);
    expect(b.breakeven).toBe(170); // 150 + 20
    expect(b.effectiveBreakeven).toBeCloseTo(166.5, 5); // 150 + 16.5
    expect(b.recoveredPct).toBeCloseTo(17.5, 5);
    expect(b.hasCoveredCalls).toBe(true);
  });

  it("floors effective cost at 0 when premium exceeds cost", () => {
    const b = projectPmccBasis({
      strikePrice: 100,
      contractPrice: 5,
      contracts: 1,
      realizedPremium: 800, // more than the $500 paid
      openCcContracts: 0,
      openCcCount: 0,
      closedCcCount: 5,
    });
    expect(b.effectiveCost).toBe(0);
    expect(b.effectiveCostPerShare).toBe(0);
    expect(b.effectiveBreakeven).toBe(100); // strike + 0
  });

  it("scales per-share by contract count", () => {
    // 3 LEAPs at $10/sh → $3,000; $600 captured → $2,400 → $8/sh
    const b = projectPmccBasis({
      strikePrice: 50,
      contractPrice: 10,
      contracts: 3,
      realizedPremium: 600,
      openCcContracts: 1,
      openCcCount: 1,
      closedCcCount: 1,
    });
    expect(b.originalCost).toBe(3000);
    expect(b.effectiveCost).toBe(2400);
    expect(b.effectiveCostPerShare).toBeCloseTo(8, 5);
    expect(b.effectiveBreakeven).toBeCloseTo(58, 5);
    expect(b.hasCoveredCalls).toBe(true);
  });

  it("reports no covered calls when none are linked", () => {
    const b = projectPmccBasis({
      strikePrice: 50,
      contractPrice: 10,
      contracts: 1,
      realizedPremium: 0,
      openCcContracts: 0,
      openCcCount: 0,
      closedCcCount: 0,
    });
    expect(b.hasCoveredCalls).toBe(false);
    expect(b.effectiveCost).toBe(b.originalCost);
    expect(b.recoveredPct).toBe(0);
  });
});
