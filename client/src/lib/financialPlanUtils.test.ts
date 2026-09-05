import { describe, expect, it } from "vitest";
import { actualsForFinancialPlanMonth, financialPlanAvailableCents, financialPlanScenarioForIncome, financialPlanVarianceCents } from "./financialPlanUtils";

describe("Plan Financiero", () => {
  const transactions = [
    { projectId: 7, type: "income" as const, status: "confirmed" as const, currency: "MXN", amountCents: 1200000, occurredAt: new Date("2026-09-08T12:00:00") },
    { projectId: 7, type: "expense" as const, status: "confirmed" as const, currency: "MXN", amountCents: 350000, occurredAt: new Date("2026-09-12T12:00:00") },
    { projectId: 7, type: "expense" as const, status: "estimated" as const, currency: "MXN", amountCents: 200000, occurredAt: new Date("2026-09-15T12:00:00") },
    { projectId: 8, type: "income" as const, status: "confirmed" as const, currency: "MXN", amountCents: 900000, occurredAt: new Date("2026-09-12T12:00:00") },
  ];

  it("usa sólo movimientos confirmados y comparables del proyecto y mes del plan", () => {
    expect(actualsForFinancialPlanMonth(transactions, 7, "MXN", new Date("2026-09-01T12:00:00"))).toEqual({ incomeCents: 1200000, expenseCents: 350000, savingsCents: 0 });
  });

  it("cuenta como ahorro real sólo los traspasos confirmados vinculados a objetivos o inversiones", () => {
    const savings = [{ projectId: 7, type: "transfer_in" as const, status: "confirmed" as const, currency: "MXN", amountCents: 50000, goalId: 3, investmentId: null, occurredAt: new Date("2026-09-20T12:00:00") }];
    expect(actualsForFinancialPlanMonth(savings, 7, "MXN", new Date("2026-09-01T12:00:00"))).toEqual({ incomeCents: 0, expenseCents: 0, savingsCents: 50000 });
  });

  it("selecciona el escenario manual que incluye el ingreso confirmado", async () => {
    expect(financialPlanScenarioForIncome([{ incomeFloorCents: 0, incomeCeilingCents: 1599999, label: "malo" }, { incomeFloorCents: 1600000, incomeCeilingCents: null, label: "base" }], 1600000)?.label).toBe("base");
  });

  it("calcula la desviación entre real y planificado", () => {
    expect(financialPlanVarianceCents(95000, 100000)).toBe(-5000);
  });

  it("muestra el disponible planeado sin ejecutar asignaciones", () => {
    expect(financialPlanAvailableCents(3000000, 2200000, 300000)).toBe(500000);
  });
});
