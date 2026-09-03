import { describe, expect, it } from "vitest";
import { actualsForFinancialPlanMonth, financialPlanAvailableCents, financialPlanScenarioForIncome } from "./financialPlanUtils";

describe("Plan Financiero", () => {
  const transactions = [
    { projectId: 7, type: "income" as const, status: "confirmed" as const, currency: "MXN", amountCents: 1200000, occurredAt: new Date("2026-09-08T12:00:00") },
    { projectId: 7, type: "expense" as const, status: "confirmed" as const, currency: "MXN", amountCents: 350000, occurredAt: new Date("2026-09-12T12:00:00") },
    { projectId: 7, type: "expense" as const, status: "estimated" as const, currency: "MXN", amountCents: 200000, occurredAt: new Date("2026-09-15T12:00:00") },
    { projectId: 8, type: "income" as const, status: "confirmed" as const, currency: "MXN", amountCents: 900000, occurredAt: new Date("2026-09-12T12:00:00") },
  ];

  it("usa sólo movimientos confirmados y comparables del proyecto y mes del plan", () => {
    expect(actualsForFinancialPlanMonth(transactions, 7, "MXN", new Date("2026-09-01T12:00:00"))).toEqual({ incomeCents: 1200000, expenseCents: 350000 });
  });

  it("selecciona el escenario manual que incluye el ingreso confirmado", () => {
    expect(financialPlanScenarioForIncome([{ incomeFloorCents: 0, incomeCeilingCents: 1599999, label: "malo" }, { incomeFloorCents: 1600000, incomeCeilingCents: null, label: "base" }], 1600000)?.label).toBe("base");
  });

  it("muestra el disponible planeado sin ejecutar asignaciones", () => {
    expect(financialPlanAvailableCents(3000000, 2200000, 300000)).toBe(500000);
  });
});
