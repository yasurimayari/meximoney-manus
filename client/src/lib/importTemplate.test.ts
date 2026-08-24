import { describe, expect, it } from "vitest";
import { createImportTemplateCsv, importTemplateFilename } from "./importTemplate";

describe("plantilla de importación", () => {
  it("mantiene las columnas que reconoce el importador y ejemplos revisables", () => {
    const [header, income, expense] = createImportTemplateCsv().trim().split("\n");
    expect(header).toBe("Fecha,Descripción,Importe,Tipo,Moneda");
    expect(income).toContain(",Ingreso,MXN");
    expect(expense).toContain(",Gasto,MXN");
    expect(importTemplateFilename).toMatch(/\.csv$/);
  });
});
