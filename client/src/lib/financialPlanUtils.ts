export type FinancialPlanTransaction = {
  projectId: number | null;
  type: "income" | "expense" | "transfer_in" | "transfer_out" | "transfer";
  status: "confirmed" | "estimated" | "needs_review";
  currency: string;
  reportCurrency?: string | null;
  amountCents: number;
  reportAmountCents?: number | null;
  occurredAt: Date | string;
  goalId?: number | null;
  investmentId?: number | null;
};

export type FinancialPlanScenario = {
  incomeFloorCents: number | null;
  incomeCeilingCents: number | null;
};

export function comparablePlanAmountCents(transaction: FinancialPlanTransaction, currency: string) {
  if (transaction.currency === currency) return transaction.amountCents;
  if (transaction.reportCurrency === currency && transaction.reportAmountCents != null) return transaction.reportAmountCents;
  return null;
}

export function actualsForFinancialPlanMonth(transactions: FinancialPlanTransaction[], projectId: number, currency: string, periodStart: Date | string) {
  const start = new Date(periodStart);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return transactions.reduce((totals, transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    const amountCents = comparablePlanAmountCents(transaction, currency);
    if (transaction.projectId !== projectId || transaction.status !== "confirmed" || amountCents === null || occurredAt < monthStart || occurredAt >= monthEnd) return totals;
    if (transaction.type === "income") totals.incomeCents += amountCents;
    if (transaction.type === "expense") totals.expenseCents += amountCents;
    if (transaction.type === "transfer_in" && (transaction.goalId != null || transaction.investmentId != null)) totals.savingsCents += amountCents;
    return totals;
  }, { incomeCents: 0, expenseCents: 0, savingsCents: 0 });
}

export function financialPlanScenarioForIncome<T extends FinancialPlanScenario>(scenarios: T[], incomeCents: number) {
  return scenarios.find(scenario => (scenario.incomeFloorCents == null || incomeCents >= scenario.incomeFloorCents) && (scenario.incomeCeilingCents == null || incomeCents <= scenario.incomeCeilingCents)) ?? null;
}

export function financialPlanVarianceCents(actualCents: number, plannedCents: number) {
  return actualCents - plannedCents;
}

export function financialPlanAvailableCents(expectedIncomeCents: number, plannedCommitmentsCents: number, plannedSavingsCents: number) {
  return expectedIncomeCents - plannedCommitmentsCents - plannedSavingsCents;
}

export function monthInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
