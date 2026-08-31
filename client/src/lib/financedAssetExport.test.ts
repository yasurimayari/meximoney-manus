import { describe, expect, it } from "vitest";
import { buildFinancedAssetCsvRows, buildFinancedAssetDetailRows, type FinancedAssetExportInput } from "./financedAssetExport";

const input: FinancedAssetExportInput = {
  asset: { id: 8, name: "Moto", type: "vehicle", institution: "Coppel", currency: "MXN", costBasisCents: 2250000, currentValueCents: 2100000, valuationDate: "2026-08-28T12:00:00.000Z", notes: "Activo de uso personal" },
  debt: { id: 3, name: "Financiación de Moto", currency: "MXN", balanceCents: 1600000 },
  payments: [{ id: 1, paidAt: "2026-06-10T12:00:00.000Z", totalPaymentCents: 85000, principalCents: 55000, interestCents: 25000, lateInterestCents: 4000, feeCents: 1000 }],
  adjustments: [{ id: 1, occurredAt: "2026-07-10T12:00:00.000Z", type: "late_interest", amountCents: 7000, notes: "Estado de cuenta" }],
  projection: { rows: [{ installment: 1, openingBalanceCents: 1600000, regularInterestCents: 20000, plannedPaymentCents: 85000, principalCents: 65000, closingBalanceCents: 1535000 }], totalProjectedInterestCents: 20000 },
};

describe("financedAssetExport", () => {
  it("includes the asset summary, payments, late charges and projection", () => {
    const rows = buildFinancedAssetDetailRows(input);
    expect(rows.map(row => row.Sección)).toEqual(["Resumen", "Resumen", "Resumen", "Pago conciliado", "Cargo manual", "Proyección"]);
    expect(rows[3].Capital).toBe(550);
    expect(rows[4]["Interés vencido"]).toBe(70);
    expect(rows[5]["Saldo final"]).toBe(15350);
  });

  it("exports only the supplied rows as quoted CSV", () => {
    const csv = buildFinancedAssetCsvRows(buildFinancedAssetDetailRows(input));
    expect(csv.startsWith("\uFEFF\"Sección\",\"Activo\",\"Fecha\"")) .toBe(true);
    expect(csv).toContain("\"Moto\"");
    expect(csv).toContain("\"Pago conciliado\"");
    expect(csv).toContain("\"Interés vencido\"");
    expect(csv).toContain("\"Estado de cuenta\"");
  });
});
