export type CreditReportSummaryRow = { provider: "buro" | "circulo"; consultedAt: Date | string; status: "active" | "archived" };

export function creditReportProviderLabel(provider: CreditReportSummaryRow["provider"]): string {
  return provider === "buro" ? "Buró de Crédito" : "Círculo de Crédito";
}

export function creditReportYearSummary(reports: CreditReportSummaryRow[], year: number) {
  const active = reports.filter(report => report.status === "active" && new Date(report.consultedAt).getFullYear() === year);
  return {
    total: active.length,
    buro: active.filter(report => report.provider === "buro").length,
    circulo: active.filter(report => report.provider === "circulo").length,
    remainingRecommended: Math.max(0, 4 - active.length),
  };
}
