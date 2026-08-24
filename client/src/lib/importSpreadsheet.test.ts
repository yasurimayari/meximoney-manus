import { describe, expect, it } from "vitest";
import { inferImportMapping, inferImportType, parseImportAmount, parseImportDate } from "./importSpreadsheet";

describe("importación local de hojas de cálculo", () => {
  it("reconoce encabezados habituales en español", () => {
    expect(inferImportMapping(["Fecha", "Concepto", "Importe", "Moneda"])).toMatchObject({ date: "Fecha", description: "Concepto", amount: "Importe", currency: "Moneda" });
  });

  it("normaliza importe, fecha y el signo como gasto", () => {
    const mapping = { amount: "Importe", type: "Tipo" };
    expect(parseImportAmount("$1,250.50")).toBe(125050);
    expect(inferImportType({ Importe: "-250.00", Tipo: null }, mapping)).toBe("expense");
    expect(parseImportDate("24/08/2026")?.toISOString().slice(0, 10)).toBe("2026-08-24");
  });
});
