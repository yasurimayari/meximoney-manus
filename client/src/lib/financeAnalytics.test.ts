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
});
