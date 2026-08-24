import { describe, expect, it } from "vitest";
import { buildInvestmentCsv, buildInvestmentExportRows, buildInvestmentPdfLines, buildInvestmentWorkbook } from "./investmentExport";

const positions = [
  { id: 1, name: "Cuenta Plata", type: "savings", institution: "Plata", currency: "MXN", currentValueCents: 250050, valuationDate: "2026-08-20T12:00:00.000Z", notes: "Fondo disponible" },
  { id: 2, name: "Bitcoin", type: "crypto", institution: null, currency: "USD", currentValueCents: 120000, valuationDate: "2026-08-18T12:00:00.000Z", notes: "Valuación manual" },
];

describe("exportación de inversiones", () => {
  it("incluye operaciones y una fila de valuación para posiciones sin operaciones", () => {
    const rows = buildInvestmentExportRows(positions, [{ investmentId: 1, type: "contribution", amountCents: 100000, occurredAt: "2026-08-21T12:00:00.000Z", notes: "Traspaso interno" }]);
    expect(rows).toEqual([
      expect.objectContaining({ Posición: "Cuenta Plata", "Tipo de posición": "Ahorro", Institución: "Plata", Operación: "Aportación", Fecha: "2026-08-21", Importe: 1000, Notas: "Traspaso interno" }),
      expect.objectContaining({ Posición: "Bitcoin", Operación: "Valuación actual", Fecha: "2026-08-18", Importe: 1200, Notas: "Valuación manual" }),
    ]);
  });

  it("genera CSV UTF-8, libro Excel y líneas PDF con fecha y notas", () => {
    const rows = buildInvestmentExportRows(positions, []);
    const csv = buildInvestmentCsv(rows);
    expect(csv).toContain('"Fecha","Posición","Tipo de posición"');
    expect(csv).toContain('"Valuación actual"');
    const workbook = buildInvestmentWorkbook(rows);
    expect(workbook.SheetNames).toEqual(["Inversiones"]);
    expect(workbook.Sheets.Inversiones?.A1?.v).toBe("Fecha");
    expect(buildInvestmentPdfLines(rows[0]!)).toEqual(expect.arrayContaining(["2026-08-20 · Cuenta Plata", "Ahorro · Plata", expect.stringContaining("Valuación actual"), "Notas: Fondo disponible"]));
  });
});
