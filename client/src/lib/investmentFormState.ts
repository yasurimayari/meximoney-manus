function toDateValue(date: Date | string | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export function buildInvestmentFormState(investment: any | null, reportCurrency: string) {
  if (!investment) return { name: "", type: "savings", entityId: "none", projectId: "none", goalId: "none", institution: "", scope: "personal", currency: reportCurrency, cost: "0", current: "0", reportCurrency, reportValue: "", exchangeRate: "", valuationDate: toDateValue(new Date()), includeInNetWorth: true, status: "active", notes: "" };
  return {
    ...investment,
    entityId: investment.entityId?.toString() ?? "none",
    projectId: investment.projectId?.toString() ?? "none",
    goalId: investment.goalId?.toString() ?? "none",
    institution: investment.institution ?? "",
    reportCurrency: investment.reportCurrency ?? reportCurrency,
    reportValue: investment.reportValueCents != null ? String(investment.reportValueCents / 100) : "",
    cost: String(investment.costBasisCents / 100),
    current: String(investment.currentValueCents / 100),
    exchangeRate: investment.exchangeRateMicros ? String(investment.exchangeRateMicros / 1_000_000) : "",
    valuationDate: toDateValue(investment.valuationDate),
    notes: investment.notes ?? "",
  };
}
