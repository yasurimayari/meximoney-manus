export function filterInvestmentsByType<T extends { type: string }>(investments: T[], type: string) {
  return type === "all" ? investments : investments.filter(investment => investment.type === type);
}
