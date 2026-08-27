import { describe, expect, it } from "vitest";
import { allocateSurplus, applyCashFlowScenario, buildCashFlowBaseline, debtSimulationSummaryState, simulateDebtPayoff } from "./financialSimulation";

describe("financialSimulation", () => {
  const debts = [
    { id: "small-low-rate", name: "Pequeña", source: "debt" as const, balanceCents: 5000, interestRateBps: 1200, minimumPaymentCents: 1000 },
    { id: "large-high-rate", name: "Grande", source: "debt" as const, balanceCents: 20000, interestRateBps: 2400, minimumPaymentCents: 1000 },
  ];

  it("distingue el orden de avalancha y bola de nieve sin tocar las entradas", () => {
    const avalanche = simulateDebtPayoff(debts, "avalanche", 1000);
    const snowball = simulateDebtPayoff(debts, "snowball", 1000);
    expect(avalanche.firstPriorityDebtId).toBe("large-high-rate");
    expect(snowball.firstPriorityDebtId).toBe("small-low-rate");
    expect(debts[0]?.balanceCents).toBe(5000);
  });

  it("no proyecta saldos exponenciales si el pago mínimo no cubre el interés", () => {
    const result = simulateDebtPayoff([{ id: "insufficient", name: "Pago insuficiente", source: "credit_card", balanceCents: 100000, interestRateBps: 120000, minimumPaymentCents: 5000 }], "avalanche", 0);
    expect(result.nonAmortizingDebtNames).toEqual(["Pago insuficiente"]);
    expect(result.months).toBe(0);
    expect(result.totalInterestCents).toBe(0);
    expect(debtSimulationSummaryState(result)).toBe("incomplete");
  });

  it("conserva el resultado de obligaciones amortizables y lo marca parcial si otra requiere un supuesto", () => {
    const result = simulateDebtPayoff([
      { id: "modelable", name: "Modelable", source: "credit_card", balanceCents: 10000, interestRateBps: 1200, minimumPaymentCents: 2500 },
      { id: "pending", name: "Pendiente", source: "credit_card", balanceCents: 100000, interestRateBps: 120000, minimumPaymentCents: 5000 },
    ], "avalanche", 0);

    expect(result.months).toBeGreaterThan(0);
    expect(result.totalInterestCents).toBeGreaterThan(0);
    expect(result.nonAmortizingDebtNames).toEqual(["Pendiente"]);
    expect(debtSimulationSummaryState(result)).toBe("partial");
  });

  it("expone conversiones excluidas y aplica hipótesis de flujo explícitas", () => {
    const baseline = buildCashFlowBaseline({ transactions: [
      { type: "income", reviewStatus: "approved", occurredAt: new Date("2026-08-03T12:00:00Z"), currency: "MXN", amountCents: 10000 },
      { type: "expense", reviewStatus: "approved", occurredAt: new Date("2026-08-04T12:00:00Z"), currency: "USD", amountCents: 5000 },
    ] }, new Date("2026-08-01T12:00:00Z"), "MXN");
    expect(baseline).toMatchObject({ incomeCents: 10000, expenseCents: 0, excludedForCurrencyCount: 1 });
    expect(applyCashFlowScenario(baseline, -1000, 500, 2000).netCashFlowCents).toBe(6500);
  });

  it("distribuye exactamente un excedente hipotético según porcentajes explícitos", () => {
    expect(allocateSurplus(10001, { reserveBps: 2500, debtBps: 5000, savingsBps: 1500, investmentBps: 1000 })).toEqual({ reserveCents: 2501, debtCents: 5000, savingsCents: 1500, investmentCents: 1000 });
  });
});
