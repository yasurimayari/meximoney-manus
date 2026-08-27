import { describe, expect, it } from "vitest";
import { buildManualAmortizationSchedule, debtPaymentBreakdownIsValid } from "./debtAmortization";

describe("amortización manual", () => {
  it("desglosa interés y capital sin reducir el saldo por encima de cero", () => {
    const result = buildManualAmortizationSchedule({ balanceCents: 120_000, annualRateBps: 1200, paymentCents: 12_000 });
    expect(result.rows[0]).toMatchObject({ openingBalanceCents: 120_000, regularInterestCents: 1_200, principalCents: 10_800, closingBalanceCents: 109_200 });
    expect(result.rows.at(-1)?.closingBalanceCents).toBe(0);
    expect(result.totalProjectedInterestCents).toBeGreaterThan(0);
  });

  it("advierte si el pago de referencia no alcanza para cubrir el interés ordinario", () => {
    const result = buildManualAmortizationSchedule({ balanceCents: 100_000, annualRateBps: 24_000, paymentCents: 1_000 });
    expect(result.rows).toHaveLength(0);
    expect(result.warning).toContain("no cubre");
  });

  it("requiere que el total pagado coincida con los cuatro componentes confirmados", () => {
    expect(debtPaymentBreakdownIsValid({ totalPaymentCents: 10_000, principalCents: 7_000, interestCents: 2_000, lateInterestCents: 500, feeCents: 500 })).toBe(true);
    expect(debtPaymentBreakdownIsValid({ totalPaymentCents: 10_000, principalCents: 7_000, interestCents: 2_000, lateInterestCents: 0, feeCents: 0 })).toBe(false);
  });
});
