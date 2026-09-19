import { describe, expect, it } from "vitest";
import { calculatePersonalScore, personalScoreLevel } from "./personalScore";

describe("SPF Score personal", () => {
  it("mantiene los factores trazables y no otorga puntos por un score crediticio inexistente", () => {
    const result = calculatePersonalScore({ netWorthCents: 120_000_00, creditCardBalanceCents: 20_000_00, creditLimitCents: 100_000_00, creditScore: null, emergencyFundCents: 60_000_00, incomeCents: 30_000_00, expenseCents: 20_000_00, recentTransactionCount: 3, habitsOptIn: true, principalPaidLast30DaysCents: 2_500_00, outstandingDebtCents: 100_000_00 });
    expect(result.factors).toMatchObject({ netWorthPoints: 100, creditUtilizationPoints: 200, creditScorePoints: 0, emergencyFundPoints: 150, cashFlowPoints: 100, habitPoints: 100, debtPaymentPoints: 100 });
    expect(result.totalScore).toBe(750);
    expect(result.dataGaps).toContain("Agrega tu score crediticio manual para completar este factor.");
  });

  it("penaliza una utilización superior al límite y conserva el nivel publicado", () => {
    const result = calculatePersonalScore({ netWorthCents: -1, creditCardBalanceCents: 120_000_00, creditLimitCents: 100_000_00, creditScore: 584, emergencyFundCents: 0, incomeCents: 0, expenseCents: 0, recentTransactionCount: 0, principalPaidLast30DaysCents: 0, outstandingDebtCents: 1 });
    expect(result.factors.creditUtilizationPoints).toBe(0);
    expect(result.level).toBe("Crisis");
    expect(personalScoreLevel(850)).toBe("Próspera");
  });
});
