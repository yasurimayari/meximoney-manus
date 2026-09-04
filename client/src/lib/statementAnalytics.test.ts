import { describe, expect, it } from "vitest";
import { breakdownByDimension, compareStatementMetrics } from "./statementAnalytics";

const rows = [
  { type: "income", amountCents: 10000, accountId: 1, categoryId: 2, occurredAt: "2026-09-05", currency: "MXN" },
  { type: "expense", amountCents: 2500, accountId: 1, categoryId: 3, occurredAt: "2026-09-08", currency: "MXN" },
  { type: "expense", amountCents: 9000, accountId: 2, categoryId: null, occurredAt: "2026-08-08", currency: "MXN" },
  { type: "expense", amountCents: 700, accountId: 1, categoryId: null, occurredAt: "2026-09-09", currency: "MXN" },
];

describe("statementAnalytics", () => {
  it("agrupa ingresos y gastos por cuenta y excluye otros periodos", () => {
    const result = breakdownByDimension(rows, "accountId", new Map([[1, "Santander"], [2, "Inbursa"]]), "MXN", new Date("2026-09-01"), new Date("2026-10-01"));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "Santander", incomeCents: 10000, expenseCents: 3200, netCents: 6800 });
  });

  it("agrupa categoría sin asignar y calcula variaciones", () => {
    const result = breakdownByDimension(rows, "categoryId", new Map([[2, "Servicios"]]), "MXN", new Date("2026-09-01"), new Date("2026-10-01"));
    expect(result.map(item => item.name)).toContain("Sin asignar");
    const comparison = compareStatementMetrics({ incomeCents: 100, expenseCents: 50, netCashFlowCents: 50, assetCents: 500, liabilityCents: 100, netWorthCents: 400, liquidCents: 300 }, { incomeCents: 120, expenseCents: 60, netCashFlowCents: 60, assetCents: 550, liabilityCents: 90, netWorthCents: 460, liquidCents: 310 });
    expect(comparison.find(item => item.metric === "incomeCents")).toMatchObject({ delta: 20, percent: 20 });
  });
});
