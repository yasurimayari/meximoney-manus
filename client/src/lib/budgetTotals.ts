export type BudgetMonthlyTotal = {
  period: string;
  incomeCents: number;
  expenseCents: number;
  savingsCents: number;
  investmentCents: number;
  requiredOutflowCents: number;
  netPlannedCents: number;
};

export function calculateBudgetMonthlyTotals(results: Array<{ budget: { type: string; plannedCents: number; periodStart: string | number | Date } }>): BudgetMonthlyTotal[] {
  const totals = new Map<string, BudgetMonthlyTotal>();
  for (const result of results) {
    const date = new Date(result.budget.periodStart);
    if (!Number.isFinite(date.getTime())) continue;
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = totals.get(period) ?? { period, incomeCents: 0, expenseCents: 0, savingsCents: 0, investmentCents: 0, requiredOutflowCents: 0, netPlannedCents: 0 };
    const amount = Math.max(0, result.budget.plannedCents);
    if (result.budget.type === "income") current.incomeCents += amount;
    if (result.budget.type === "expense") current.expenseCents += amount;
    if (result.budget.type === "savings") current.savingsCents += amount;
    if (result.budget.type === "investment") current.investmentCents += amount;
    current.requiredOutflowCents = current.expenseCents + current.savingsCents + current.investmentCents;
    current.netPlannedCents = current.incomeCents - current.requiredOutflowCents;
    totals.set(period, current);
  }
  return Array.from(totals.values()).sort((a, b) => a.period.localeCompare(b.period));
}
