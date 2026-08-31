import { describe, expect, it } from "vitest";
import { buildPatrimonyHistoryCsv, buildPatrimonyHistoryWorkbook } from "./patrimonyHistoryExport";

describe("patrimonyHistoryExport", () => {
  const rows = [
    { periodo: "ago 2026", activos: 15000, pasivos: 4200.5, patrimonioNeto: 10799.5, origen: "Cierre mensual" },
    { periodo: "Actual", activos: 16000, pasivos: 4000, patrimonioNeto: 12000, origen: "Cálculo vivo" },
  ];

  it("genera CSV UTF-8 con la evolución y sus valores decimales", () => {
    const csv = buildPatrimonyHistoryCsv(rows);
    expect(csv.startsWith("\uFEFF"),).toBe(true);
    expect(csv).toContain('"Periodo","Activos","Pasivos","Patrimonio neto","Origen"');
    expect(csv).toContain('"ago 2026","15000.00","4200.50","10799.50","Cierre mensual"');
    expect(csv).toContain('"Actual","16000.00","4000.00","12000.00","Cálculo vivo"');
  });

  it("genera un libro Excel con una hoja Evolución y columnas trazables", () => {
    const workbook = buildPatrimonyHistoryWorkbook(rows);
    expect(workbook.SheetNames).toEqual(["Evolución"]);
    expect(workbook.Sheets.Evolución?.A1?.v).toBe("Periodo");
    expect(workbook.Sheets.Evolución?.D2?.v).toBe(10799.5);
    expect(workbook.Sheets.Evolución?.E2?.v).toBe("Cierre mensual");
  });
});
