import { describe, expect, it } from "vitest";
import { calculateDaysLate, calculateMoratoriumInterest } from "./moratorium";

describe("interés moratorio configurable", () => {
  it("calcula días completos de atraso y simple interest con base 365", () => {
    const result = calculateMoratoriumInterest({
      balanceCents: 1_000_000,
      annualRateBps: 3_650,
      overdueSinceAt: "2026-01-01T00:00:00Z",
      asOf: "2026-01-11T00:00:00Z",
    });
    expect(result.daysLate).toBe(10);
    expect(result.interestCents).toBe(10_000);
    expect(result.isConfigured).toBe(true);
  });

  it("permite una base manual y no calcula si falta configuración", () => {
    expect(calculateDaysLate("2026-02-01T00:00:00Z", "2026-01-31T00:00:00Z")).toBe(0);
    const result = calculateMoratoriumInterest({ balanceCents: 500_000, annualRateBps: null, overdueSinceAt: "2026-01-01T00:00:00Z", asOf: "2026-02-01T00:00:00Z", basisCents: 400_000 });
    expect(result.baseCents).toBe(400_000);
    expect(result.interestCents).toBe(0);
    expect(result.isConfigured).toBe(false);
  });
});
