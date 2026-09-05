import { describe, expect, it } from "vitest";
import { creditReportProviderLabel, creditReportYearSummary, latestActiveCreditReport, nextCreditReportDueDate } from "./creditReportUtils";

describe("creditReportUtils", () => {
  it("resume hasta cuatro consultas activas por año y separa instituciones", () => {
    const summary = creditReportYearSummary([
      { provider: "buro", consultedAt: "2026-01-15T12:00:00.000Z", status: "active" },
      { provider: "circulo", consultedAt: "2026-04-15T12:00:00.000Z", status: "active" },
      { provider: "buro", consultedAt: "2026-07-15T12:00:00.000Z", status: "active" },
      { provider: "circulo", consultedAt: "2026-10-15T12:00:00.000Z", status: "active" },
      { provider: "buro", consultedAt: "2026-12-01T12:00:00.000Z", status: "archived" },
    ], 2026);
    expect(summary).toEqual({ total: 4, buro: 2, circulo: 2, remainingRecommended: 0 });
  });

  it("traduce los nombres oficiales de las instituciones", () => {
    expect(creditReportProviderLabel("buro")).toBe("Buró de Crédito");
    expect(creditReportProviderLabel("circulo")).toBe("Círculo de Crédito");
  });

  it("calcula el siguiente trimestre sin desbordar el último día del mes", () => {
    expect(nextCreditReportDueDate("2026-11-30T12:00:00").toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("selecciona el informe activo más reciente e ignora archivados", () => {
    const latest = latestActiveCreditReport([
      { provider: "buro", consultedAt: "2026-01-10", status: "active" },
      { provider: "circulo", consultedAt: "2026-08-10", status: "archived" },
      { provider: "circulo", consultedAt: "2026-07-10", status: "active" },
    ]);
    expect(latest?.provider).toBe("circulo");
    expect(latest?.consultedAt).toBe("2026-07-10");
  });
});
