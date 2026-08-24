import { describe, expect, it } from "vitest";
import { budgetStatusLabel, calculateBudgetVsActual } from "./budgetVsActual";

const period = "2026-08-01T12:00:00.000Z";

describe("Presupuesto versus Real", () => {
  it("usa sólo movimientos aprobados y conversiones manuales comparables para ingresos y gastos", () => {
    const results = calculateBudgetVsActual({
      budgets: [
        { id: 1, type: "income", scope: "personal", categoryId: 10, plannedCents: 10000, periodStart: period },
        { id: 2, type: "expense", scope: "personal", categoryId: 20, plannedCents: 8000, periodStart: period },
      ],
      transactions: [
        { type: "income", scope: "personal", categoryId: 10, currency: "MXN", amountCents: 12000, reviewStatus: "approved", occurredAt: "2026-08-12T12:00:00.000Z" },
        { type: "income", scope: "personal", categoryId: 10, currency: "USD", amountCents: 5000, reportCurrency: "MXN", reportAmountCents: 3000, reviewStatus: "approved", occurredAt: "2026-08-13T12:00:00.000Z" },
        { type: "income", scope: "personal", categoryId: 10, currency: "USD", amountCents: 1000, reviewStatus: "approved", occurredAt: "2026-08-14T12:00:00.000Z" },
        { type: "income", scope: "personal", categoryId: 10, currency: "MXN", amountCents: 9000, reviewStatus: "draft", occurredAt: "2026-08-15T12:00:00.000Z" },
        { type: "expense", scope: "personal", categoryId: 20, currency: "MXN", amountCents: 9000, reviewStatus: "approved", occurredAt: "2026-08-16T12:00:00.000Z" },
      ],
      investments: [],
      investmentOperations: [],
    }, "MXN");
    expect(results[0]).toMatchObject({ actualCents: 15000, differenceCents: 5000, status: "within_plan", excludedForCurrencyCount: 1 });
    expect(results[1]).toMatchObject({ actualCents: 9000, differenceCents: 1000, status: "over_plan" });
  });

  it("distingue aportaciones a ahorro e inversión y no suma aportaciones en otra moneda", () => {
    const results = calculateBudgetVsActual({
      budgets: [
        { id: 3, type: "savings", scope: "personal", categoryId: null, plannedCents: 5000, periodStart: period },
        { id: 4, type: "investment", scope: "personal", categoryId: null, plannedCents: 7000, periodStart: period },
      ],
      transactions: [],
      investments: [
        { id: 1, type: "savings", scope: "personal" },
        { id: 2, type: "stock", scope: "personal" },
      ],
      investmentOperations: [
        { investmentId: 1, type: "contribution", currency: "MXN", amountCents: 4500, occurredAt: "2026-08-08T12:00:00.000Z" },
        { investmentId: 2, type: "contribution", currency: "MXN", amountCents: 8000, occurredAt: "2026-08-09T12:00:00.000Z" },
        { investmentId: 2, type: "contribution", currency: "USD", amountCents: 2000, occurredAt: "2026-08-10T12:00:00.000Z" },
      ],
    }, "MXN");
    expect(results[0]).toMatchObject({ actualCents: 4500, status: "within_plan", actualSource: "contributions" });
    expect(results[1]).toMatchObject({ actualCents: 8000, status: "over_plan", excludedForCurrencyCount: 1 });
    expect(budgetStatusLabel(results[1]!)).toBe("Por encima de lo previsto");
  });
});
