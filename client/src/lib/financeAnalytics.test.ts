import { describe, expect, it } from "vitest";
import { buildAssetAllocation, buildExpenseCategories, buildMonthlySeries, buildMonthlySeriesForYear, investmentValue } from "./financeAnalytics";

const snapshot = {
  categories: [{ id: 1, name: "Operación" }, { id: 2, name: "Hogar" }],
  transactions: [
    { type: "expense", amountCents: 20000, categoryId: 1, status: "confirmed", reviewStatus: "approved" },
    { type: "expense", amountCents: 5000, categoryId: 2, status: "confirmed", reviewStatus: "approved" },
    { type: "income", amountCents: 80000, categoryId: null, status: "confirmed", reviewStatus: "approved" },
  ],
  accounts: [
    { type: "investment", currentValueCents: 125000, status: "active" },
    { type: "bank", currentValueCents: 50000, status: "active" },
    { type: "pension", currentValueCents: 30000, status: "closed" },
  ],
};

describe("agregaciones analíticas", () => {
  it("agrupa solo gastos por categoría", () => {
    expect(buildExpenseCategories(snapshot)).toEqual([{ name: "Operación", value: 200 }, { name: "Hogar", value: 50 }]);
  });

  it("excluye activos cerrados y suma inversiones y jubilación activas", () => {
    expect(buildAssetAllocation(snapshot)).toEqual([{ name: "Inversiones", value: 1250 }, { name: "Cuentas", value: 500 }]);
    expect(investmentValue(snapshot)).toBe(125000);
  });

  it("no mezcla divisas sin importe de reporte confirmado", () => {
    const multiCurrencySnapshot = {
      profile: { currency: "MXN" },
      dashboard: { reportCurrency: "MXN" },
      categories: [{ id: 1, name: "Operación" }],
      transactions: [
        { type: "expense", amountCents: 10000, currency: "USD", reportCurrency: "MXN", reportAmountCents: 180000, categoryId: 1, status: "confirmed", reviewStatus: "approved" },
        { type: "expense", amountCents: 5000, currency: "EUR", reportCurrency: null, reportAmountCents: null, categoryId: 1, status: "confirmed", reviewStatus: "approved" },
      ],
      accounts: [
        { type: "investment", currentValueCents: 100000, currency: "MXN", status: "active" },
        { type: "investment", currentValueCents: 80000, currency: "USD", status: "active" },
      ],
    };

    expect(buildExpenseCategories(multiCurrencySnapshot)).toEqual([{ name: "Operación", value: 1800 }]);
    expect(buildAssetAllocation(multiCurrencySnapshot)).toEqual([{ name: "Inversiones", value: 1000 }]);
    expect(investmentValue(multiCurrencySnapshot)).toBe(100000);
  });

  it("construye ventanas largas y permite anclarlas a un año explícito", () => {
    const dated = { ...snapshot, transactions: [{ type: "income", amountCents: 10000, occurredAt: new Date("2023-01-12"), currency: "MXN", status: "confirmed", reviewStatus: "approved" }] };
    expect(buildMonthlySeries(dated, 24, new Date("2024-12-15")).map(item => item.key)).toEqual(expect.arrayContaining(["2023-01", "2024-12"]));
    expect(buildMonthlySeriesForYear(dated, 2023)).toHaveLength(12);
    expect(buildMonthlySeriesForYear(dated, 2023).find(item => item.key === "2023-01")?.ingresos).toBe(100);
  });

  it("excluye estimados y pendientes de revisión de los agregados", () => {
    const pending = { ...snapshot, transactions: [{ type: "expense", amountCents: 9000, categoryId: 1, occurredAt: new Date("2026-08-10"), currency: "MXN", status: "needs_review", reviewStatus: "pending_review" }] };
    expect(buildExpenseCategories(pending)).toEqual([]);
    expect(buildMonthlySeries(pending, 1, new Date("2026-08-15"))[0]).toMatchObject({ ingresos: 0, gastos: 0, ahorro: 0 });
  });
});
