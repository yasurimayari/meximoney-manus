import { describe, expect, it } from "vitest";
import { investmentTemplateCsv, parseInvestmentCsv } from "./investmentImport";
describe("importación CSV de inversiones", () => {
  it("lee la plantilla local y detecta posiciones inválidas antes de confirmar", () => {
    expect(parseInvestmentCsv(investmentTemplateCsv()).errors).toEqual([]);
    expect(parseInvestmentCsv("Nombre,Tipo,Moneda,Costo,Valor_actual\nBitcoin,desconocido,USD,10,12").errors).toHaveLength(1);
  });
});
