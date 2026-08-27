import { describe, expect, it } from "vitest";
import { buildAmortizationSummary, buildAmortizationWorkbook } from "./amortizationExport";

const debt = { id: 9, name: "Moto", currency: "MXN", balanceCents: 75_000 };
const payments = [{ id: 1, paidAt: "2026-08-01T12:00:00.000Z", totalPaymentCents: 20_000, principalCents: 12_000, interestCents: 5_000, lateInterestCents: 2_000, feeCents: 1_000 }];

describe("exportación de amortización", () => {
  it("resume capital, intereses y capital restante sin confundir los cargos", () => {
    expect(buildAmortizationSummary(debt, payments)).toEqual({ capitalPaidCents: 12_000, regularInterestPaidCents: 5_000, lateInterestPaidCents: 2_000, feesPaidCents: 1_000, totalInterestPaidCents: 7_000, totalPaidCents: 20_000, capitalRemainingCents: 75_000 });
  });

  it("incluye resumen, pagos, proyección y cargos en hojas separadas", () => {
    const book = buildAmortizationWorkbook(debt, payments, { rows: [], totalProjectedInterestCents: 8_000 }, []);
    expect(book.SheetNames).toEqual(["Resumen", "Pagos conciliados", "Proyección", "Cargos manuales"]);
  });
});
