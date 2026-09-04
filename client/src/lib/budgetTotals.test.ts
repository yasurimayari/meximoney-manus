import { describe, expect, it } from "vitest";
import { calculateBudgetMonthlyTotals } from "./budgetTotals";

describe("calculateBudgetMonthlyTotals", () => {
  it("totaliza partidas del mismo mes y calcula la necesidad total", () => {
    const result = calculateBudgetMonthlyTotals([
      { budget: { type: "income", plannedCents: 300000, periodStart: "2026-09-01" } },
      { budget: { type: "expense", plannedCents: 120000, periodStart: "2026-09-01" } },
      { budget: { type: "savings", plannedCents: 50000, periodStart: "2026-09-01" } },
      { budget: { type: "investment", plannedCents: 30000, periodStart: "2026-09-01" } },
    ]);
    expect(result).toEqual([{ period: "2026-09", incomeCents: 300000, expenseCents: 120000, savingsCents: 50000, investmentCents: 30000, requiredOutflowCents: 200000, netPlannedCents: 100000 }]);
  });

  it("separa meses, ignora importes negativos y ordena cronológicamente", () => {
    const result = calculateBudgetMonthlyTotals([
      { budget: { type: "expense", plannedCents: -1, periodStart: "2026-10-01" } },
      { budget: { type: "income", plannedCents: 100, periodStart: "2026-10-01" } },
      { budget: { type: "expense", plannedCents: 20, periodStart: "2026-09-01" } },
    ]);
    expect(result.map(item => item.period)).toEqual(["2026-09", "2026-10"]);
    expect(result[1].netPlannedCents).toBe(100);
  });
});
