import { describe, expect, it } from "vitest";
import { buildStatementWorkbook } from "./statementExport";

describe("statementExport", () => {
  const statement = { incomeCents: 150000, expenseCents: 50000, netCashFlowCents: 100000, assetCents: 900000, liabilityCents: 300000, netWorthCents: 600000, liquidCents: 400000 };
  const metadata = { period: "2026-09", scope: "Personal", currency: "MXN" };

  it("construye un libro de Balance General con metadatos y saldos", () => {
    const book = buildStatementWorkbook("balance", statement, metadata);
    const rows = book.Sheets["Balance General"];
    expect(rows?.["A1"]?.v).toBe("Richeon");
    expect(rows?.["B2"]?.v).toBe("2026-09");
    expect(rows?.["A7"]?.v).toBe("Activos");
    expect(rows?.["B7"]?.v).toContain("9,000.00");
  });

  it("incluye el flujo neto en Estado de Resultado", () => {
    const book = buildStatementWorkbook("income", statement, metadata);
    const rows = book.Sheets["Estado de Resultado"];
    expect(rows?.["A9"]?.v).toBe("Resultado del periodo");
    expect(rows?.["B9"]?.v).toContain("1,000.00");
  });
});
