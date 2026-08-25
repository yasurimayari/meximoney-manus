import { describe, expect, it } from "vitest";
import { calculateLiquidity, calculateMonthlyStatement, calculateNetWorth, monthBounds, summarizeCashFlow, summarizeCashFlowInReportCurrency, transferIntegrityIssues, withNetCashFlow } from "./finance";

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

  it("construye un estado mensual separado por ámbito y excluye transferencias", () => {
    const { start, end } = monthBounds(new Date("2026-08-15T12:00:00Z"));
    const statement = calculateMonthlyStatement([
      { type: "income", scope: "personal", amountCents: 100000, occurredAt: new Date("2026-08-03T12:00:00Z"), categoryId: 1, accountId: 1, transferGroupId: null },
      { type: "expense", scope: "personal", amountCents: 35000, occurredAt: new Date("2026-08-05T12:00:00Z"), categoryId: 2, accountId: 1, transferGroupId: null },
      { type: "transfer_out", scope: "personal", amountCents: 12000, occurredAt: new Date("2026-08-06T12:00:00Z"), categoryId: null, accountId: 1, transferGroupId: "a" },
      { type: "income", scope: "business", amountCents: 90000, occurredAt: new Date("2026-08-08T12:00:00Z"), categoryId: 3, accountId: 2, transferGroupId: null },
    ], [
      { currentValueCents: 150000, isLiquid: true, status: "active" as const, scope: "personal" as const },
      { currentValueCents: 300000, isLiquid: false, status: "active" as const, scope: "business" as const },
    ], [
      { balanceCents: 40000, status: "active" as const, scope: "personal" as const },
      { balanceCents: 20000, status: "paid" as const, scope: "business" as const },
    ], start, end, "personal");

    expect(statement).toEqual({ incomeCents: 100000, expenseCents: 35000, netCashFlowCents: 65000, assetCents: 150000, liabilityCents: 40000, netWorthCents: 110000, liquidCents: 150000 });
  });

  it("incluye una tarjeta PFAE como pasivo del consolidado empresarial sin cambiar su etiqueta", () => {
    const { start, end } = monthBounds(new Date("2026-08-15T12:00:00Z"));
    const statement = calculateMonthlyStatement([], [], [
      { balanceCents: 66_7388, status: "active" as const, scope: "pfae" as const },
    ], start, end, "business");

    expect(statement).toMatchObject({ liabilityCents: 66_7388, netWorthCents: -66_7388 });
  });

  it("consolida sólo la moneda de reporte confirmada y deja visibles las partidas sin conversión", () => {
    const { start, end } = monthBounds(new Date("2026-08-15T12:00:00Z"));
    const summary = summarizeCashFlowInReportCurrency([
      { type: "income", amountCents: 100000, currency: "MXN", occurredAt: new Date("2026-08-03T12:00:00Z"), categoryId: 1, accountId: 1, transferGroupId: null },
      { type: "income", amountCents: 10000, currency: "USD", reportCurrency: "MXN", reportAmountCents: 180000, occurredAt: new Date("2026-08-04T12:00:00Z"), categoryId: 1, accountId: 1, transferGroupId: null },
      { type: "expense", amountCents: 5000, currency: "EUR", reportCurrency: null, reportAmountCents: null, occurredAt: new Date("2026-08-05T12:00:00Z"), categoryId: 2, accountId: 1, transferGroupId: null },
    ], start, end, "MXN");

    expect(summary).toEqual({ incomeCents: 280000, expenseCents: 0, pendingConversionCount: 1 });
  });
});
