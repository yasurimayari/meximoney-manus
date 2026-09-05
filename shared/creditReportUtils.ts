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

export function nextCreditReportDueDate(consultedAt: Date | string): Date {
  const source = new Date(consultedAt);
  const targetYear = source.getFullYear() + Math.floor((source.getMonth() + 3) / 12);
  const targetMonth = (source.getMonth() + 3) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  return new Date(targetYear, targetMonth, Math.min(source.getDate(), lastDay), source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
}

export function latestActiveCreditReport<T extends CreditReportSummaryRow>(reports: T[]): T | null {
  return reports.filter(report => report.status === "active").sort((left, right) => new Date(right.consultedAt).getTime() - new Date(left.consultedAt).getTime())[0] ?? null;
}
