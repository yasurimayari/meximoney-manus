import { describe, expect, it } from "vitest";
import { buildAssetAllocation, buildExpenseCategories, investmentValue } from "./financeAnalytics";

const snapshot = {
  categories: [{ id: 1, name: "Operación" }, { id: 2, name: "Hogar" }],
  transactions: [
    { type: "expense", amountCents: 20000, categoryId: 1 },
    { type: "expense", amountCents: 5000, categoryId: 2 },
    { type: "income", amountCents: 80000, categoryId: null },
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
        { type: "expense", amountCents: 10000, currency: "USD", reportCurrency: "MXN", reportAmountCents: 180000, categoryId: 1 },
        { type: "expense", amountCents: 5000, currency: "EUR", reportCurrency: null, reportAmountCents: null, categoryId: 1 },
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
});
