import { describe, expect, it } from "vitest";
import { calculateLiquidity, calculateNetWorth, monthBounds, summarizeCashFlow, transferIntegrityIssues, withNetCashFlow } from "./finance";

describe("cálculos financieros manuales", () => {
  it("excluye transferencias internas del flujo de caja", () => {
    const { start, end } = monthBounds(new Date("2026-08-15T12:00:00Z"));
    const summary = withNetCashFlow(summarizeCashFlow([
      { type: "income", amountCents: 100000, occurredAt: new Date("2026-08-02T12:00:00Z"), categoryId: 1, accountId: 1, transferGroupId: null },
      { type: "expense", amountCents: 35000, occurredAt: new Date("2026-08-05T12:00:00Z"), categoryId: 2, accountId: 1, transferGroupId: null },
      { type: "transfer_out", amountCents: 20000, occurredAt: new Date("2026-08-07T12:00:00Z"), categoryId: null, accountId: 1, transferGroupId: "t-1" },
      { type: "transfer_in", amountCents: 20000, occurredAt: new Date("2026-08-07T12:00:00Z"), categoryId: null, accountId: 2, transferGroupId: "t-1" },
    ], start, end));

    expect(summary).toEqual({ incomeCents: 100000, expenseCents: 35000, netCashFlowCents: 65000 });
  });

  it("calcula el patrimonio neto solo con activos y deudas vigentes", () => {
    const result = calculateNetWorth([
      { currentValueCents: 180000, status: "active" as const },
      { currentValueCents: 90000, status: "closed" as const },
    ], [
      { balanceCents: 25000, status: "active" as const },
      { balanceCents: 40000, status: "paid" as const },
    ]);

    expect(result).toEqual({ assetCents: 180000, liabilityCents: 25000, netWorthCents: 155000 });
  });

  it("estima la cobertura de liquidez sin incluir activos no líquidos", () => {
    const result = calculateLiquidity([
      { currentValueCents: 60000, isLiquid: true, status: "active" as const },
      { currentValueCents: 160000, isLiquid: false, status: "active" as const },
      { currentValueCents: 10000, isLiquid: true, status: "closed" as const },
    ], 20000);

    expect(result).toEqual({ liquidCents: 60000, coverageMonths: 3 });
  });

  it("señala transferencias sin contrapartida o con importe incoherente", () => {
    const issues = transferIntegrityIssues([
      { type: "transfer_out", amountCents: 10000, occurredAt: new Date(), categoryId: null, accountId: 1, transferGroupId: "faltante" },
      { type: "transfer_out", amountCents: 40000, occurredAt: new Date(), categoryId: null, accountId: 1, transferGroupId: "distinto" },
      { type: "transfer_in", amountCents: 35000, occurredAt: new Date(), categoryId: null, accountId: 2, transferGroupId: "distinto" },
      { type: "transfer_out", amountCents: 5000, occurredAt: new Date(), categoryId: null, accountId: 1, transferGroupId: "correcto" },
      { type: "transfer_in", amountCents: 5000, occurredAt: new Date(), categoryId: null, accountId: 2, transferGroupId: "correcto" },
    ]);

    expect(issues).toEqual(["faltante", "distinto"]);
  });
});
