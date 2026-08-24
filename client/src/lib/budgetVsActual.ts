export type BudgetType = "income" | "expense" | "savings" | "investment";

export type BudgetActualResult = {
  budget: any;
  actualCents: number;
  differenceCents: number;
  isWithinPlan: boolean;
  status: "on_target" | "within_plan" | "over_plan";
  excludedForCurrencyCount: number;
  actualSource: "transactions" | "contributions";
};

function isSameMonth(value: Date | string, periodStart: Date | string) {
  const date = new Date(value);
  const period = new Date(periodStart);
  return date.getFullYear() === period.getFullYear() && date.getMonth() === period.getMonth();
}

function matchesBudgetScope(item: any, budget: any) {
  return (budget.scope === "mixed" || item.scope === budget.scope)
    && (!budget.entityId || item.entityId === budget.entityId)
    && (!budget.projectId || item.projectId === budget.projectId);
}

function comparableTransactionAmountCents(transaction: any, reportCurrency: string) {
  if (transaction.currency === reportCurrency) return transaction.amountCents;
  if (transaction.reportCurrency === reportCurrency && typeof transaction.reportAmountCents === "number") return transaction.reportAmountCents;
  return null;
}

function statusFor(type: BudgetType, differenceCents: number): BudgetActualResult["status"] {
  if (differenceCents === 0) return "on_target";
  const isOverPlan = type === "income" ? differenceCents < 0 : differenceCents > 0;
  return isOverPlan ? "over_plan" : "within_plan";
}

export function calculateBudgetVsActual(snapshot: any, reportCurrency: string): BudgetActualResult[] {
  const positionsById = new Map<number, any>((snapshot.investments ?? []).map((position: any) => [position.id, position]));
  return (snapshot.budgets ?? []).map((budget: any) => {
    const type = budget.type as BudgetType;
    let actualCents = 0;
    let excludedForCurrencyCount = 0;
    const isContributionBudget = type === "savings" || type === "investment";
    if (isContributionBudget) {
      (snapshot.investmentOperations ?? []).forEach((operation: any) => {
        const position = positionsById.get(operation.investmentId);
        if (!position || operation.type !== "contribution" || !isSameMonth(operation.occurredAt, budget.periodStart) || !matchesBudgetScope(position, budget)) return;
        const matchesPositionType = type === "savings" ? position.type === "savings" : position.type !== "savings";
        if (!matchesPositionType) return;
        if (operation.currency !== reportCurrency) {
          excludedForCurrencyCount += 1;
          return;
        }
        actualCents += operation.amountCents;
      });
    } else {
      (snapshot.transactions ?? []).forEach((transaction: any) => {
        if (transaction.type !== type || transaction.reviewStatus !== "approved" || !isSameMonth(transaction.occurredAt, budget.periodStart) || !matchesBudgetScope(transaction, budget)) return;
        if (budget.categoryId ? transaction.categoryId !== budget.categoryId : transaction.categoryId !== null) return;
        const amount = comparableTransactionAmountCents(transaction, reportCurrency);
        if (amount === null) {
          excludedForCurrencyCount += 1;
          return;
        }
        actualCents += amount;
      });
    }
    const differenceCents = actualCents - budget.plannedCents;
    const status = statusFor(type, differenceCents);
    return {
      budget,
      actualCents,
      differenceCents,
      isWithinPlan: status !== "over_plan",
      status,
      excludedForCurrencyCount,
      actualSource: isContributionBudget ? "contributions" : "transactions",
    };
  });
}

export function budgetTypeLabel(type: BudgetType) {
  return { income: "Ingreso", expense: "Gasto", savings: "Ahorro", investment: "Inversión" }[type];
}

export function budgetStatusLabel(result: BudgetActualResult) {
  if (result.status === "on_target") return "En el plan";
  if (result.budget.type === "income") return result.status === "within_plan" ? "Por encima del ingreso previsto" : "Por debajo del ingreso previsto";
  return result.status === "within_plan" ? "Dentro de lo previsto" : "Por encima de lo previsto";
}
