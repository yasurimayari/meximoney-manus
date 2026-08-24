export type ManualInvestmentValue = {
  currency: string;
  currentValueCents: number;
  reportCurrency: string | null;
  reportValueCents: number | null;
  includeInNetWorth: boolean;
  status: "active" | "paused" | "closed";
};

export function comparableInvestmentValueCents(investment: ManualInvestmentValue, reportCurrency: string) {
  if (!investment.includeInNetWorth || investment.status === "closed") return null;
  if (investment.currency === reportCurrency) return investment.currentValueCents;
  if (investment.reportCurrency === reportCurrency && investment.reportValueCents !== null) return investment.reportValueCents;
  return null;
}

export function investmentNeedsManualConversion(investment: ManualInvestmentValue, reportCurrency: string) {
  return investment.includeInNetWorth && investment.status === "active" && investment.currency !== reportCurrency && comparableInvestmentValueCents(investment, reportCurrency) === null;
}
