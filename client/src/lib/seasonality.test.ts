import { describe, expect, it } from "vitest";
import { buildSeasonality } from "./seasonality";

describe("estacionalidad manual", () => {
  it("excluye traspasos, monedas no comparables y movimientos pendientes", () => {
    const result = buildSeasonality([
      { occurredAt: "2025-01-10", type: "income", status: "confirmed", reviewStatus: "approved", currency: "MXN", amountCents: 10000 },
      { occurredAt: "2026-01-10", type: "expense", status: "confirmed", reviewStatus: "approved", currency: "MXN", amountCents: 4000 },
      { occurredAt: "2026-02-10", type: "income", status: "confirmed", reviewStatus: "approved", currency: "USD", amountCents: 9999 },
      { occurredAt: "2026-02-10", type: "transfer_in", status: "confirmed", reviewStatus: "approved", currency: "MXN", amountCents: 9999 },
      { occurredAt: "2026-02-10", type: "expense", status: "needs_review", reviewStatus: "pending_review", currency: "MXN", amountCents: 9999 },
    ], "MXN");
    expect(result.observedMonthCount).toBe(2);
    expect(result.isSufficient).toBe(false);
    expect(result.months).toEqual([{ month: 0, label: "Ene", ingresos: 5000, gastos: 2000, neto: 3000, observedPeriods: 2, movementCount: 2 }]);
  });

  it("activa la lectura descriptiva al reunir seis meses observados", () => {
    const transactions = Array.from({ length: 6 }, (_, month) => ({ occurredAt: new Date(2026, month, 10), type: month === 4 ? "expense" : "income", status: "confirmed", reviewStatus: "approved", currency: "MXN", amountCents: (month + 1) * 1000 }));
    const result = buildSeasonality(transactions, "MXN");
    expect(result.observedMonthCount).toBe(6);
    expect(result.isSufficient).toBe(true);
    expect(result.highestIncomeMonth?.label).toBe("Jun");
    expect(result.highestExpenseMonth?.label).toBe("May");
  });
});
