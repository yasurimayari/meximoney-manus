import { describe, expect, it } from "vitest";
import { buildInvestmentFormState } from "./investmentFormState";

describe("precarga de la posición de inversión", () => {
  it("conserva todos los valores existentes al abrir la edición de un vehículo", () => {
    const state = buildInvestmentFormState({ id: 44, name: "Moto", type: "vehicle", entityId: 7, projectId: 9, goalId: 5, institution: "Coppel", scope: "personal", currency: "MXN", costBasisCents: 2250000, currentValueCents: 2100000, reportCurrency: null, reportValueCents: null, exchangeRateMicros: null, valuationDate: new Date("2025-12-01T12:00:00Z"), includeInNetWorth: true, status: "active", notes: "Financiada" }, "MXN");
    expect(state).toMatchObject({ id: 44, name: "Moto", type: "vehicle", entityId: "7", projectId: "9", goalId: "5", institution: "Coppel", cost: "22500", current: "21000", valuationDate: "2025-12-01", notes: "Financiada" });
  });
});
