export type ManualTransaction = {
  type: "income" | "expense" | "transfer_out" | "transfer_in";
  amountCents: number;
  occurredAt: Date;
  categoryId: number | null;
  accountId: number | null;
  transferGroupId: string | null;
};

export function monthBounds(reference = new Date()) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return { start, end };
}

export function isInPeriod(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

export function summarizeCashFlow(
  transactions: ManualTransaction[],
  start: Date,
  end: Date
) {
  return transactions.filter(transaction => isInPeriod(transaction.occurredAt, start, end)).reduce(
    (summary, transaction) => {
      if (transaction.type === "income") summary.incomeCents += transaction.amountCents;
      if (transaction.type === "expense") summary.expenseCents += transaction.amountCents;
      return summary;
    },
    { incomeCents: 0, expenseCents: 0, netCashFlowCents: 0 }
  );
}

type ReportableTransaction = ManualTransaction & {
  currency?: string;
  reportCurrency?: string | null;
  reportAmountCents?: number | null;
};

export function reportedAmountCents(transaction: ReportableTransaction, reportCurrency: string) {
  if (transaction.reportCurrency === reportCurrency && typeof transaction.reportAmountCents === "number") return transaction.reportAmountCents;
  if (transaction.currency === reportCurrency) return transaction.amountCents;
  return null;
}

export function summarizeCashFlowInReportCurrency(
  transactions: ReportableTransaction[],
  start: Date,
  end: Date,
  reportCurrency: string
) {
  return transactions.filter(transaction => isInPeriod(transaction.occurredAt, start, end)).reduce(
    (summary, transaction) => {
      if (transaction.type !== "income" && transaction.type !== "expense") return summary;
      const amountCents = reportedAmountCents(transaction, reportCurrency);
      if (amountCents === null) {
        summary.pendingConversionCount += 1;
        return summary;
      }
      if (transaction.type === "income") summary.incomeCents += amountCents;
      if (transaction.type === "expense") summary.expenseCents += amountCents;
      return summary;
    },
    { incomeCents: 0, expenseCents: 0, pendingConversionCount: 0 }
  );
}

export function withNetCashFlow<T extends { incomeCents: number; expenseCents: number }>(summary: T) {
  return { ...summary, netCashFlowCents: summary.incomeCents - summary.expenseCents };
}

export function calculateNetWorth(
  accounts: Array<{ currentValueCents: number; status: "active" | "closed" }>,
  debts: Array<{ balanceCents: number; status: "active" | "paid" | "review" }>
) {
  const assetCents = accounts
    .filter(account => account.status === "active")
    .reduce((total, account) => total + account.currentValueCents, 0);
  const liabilityCents = debts
    .filter(debt => debt.status === "active" || debt.status === "review")
    .reduce((total, debt) => total + debt.balanceCents, 0);
  return { assetCents, liabilityCents, netWorthCents: assetCents - liabilityCents };
}

export function calculateLiquidity(
  accounts: Array<{ currentValueCents: number; isLiquid: boolean; status: "active" | "closed" }>,
  essentialExpensesCents: number
) {
  const liquidCents = accounts
    .filter(account => account.status === "active" && account.isLiquid)
    .reduce((total, account) => total + account.currentValueCents, 0);
  return {
    liquidCents,
    coverageMonths: essentialExpensesCents > 0 ? liquidCents / essentialExpensesCents : null,
  };
}

type Scope = "personal" | "business" | "mixed";

function isInScope(itemScope: Scope, selectedScope: Scope) {
  return selectedScope === "mixed" ? true : itemScope === selectedScope;
}

export function calculateMonthlyStatement(
  transactions: Array<ReportableTransaction & { scope: Scope }>,
  accounts: Array<{ currentValueCents: number; isLiquid: boolean; status: "active" | "closed"; scope: Scope }>,
  debts: Array<{ balanceCents: number; status: "active" | "paid" | "review"; scope: Scope }>,
  start: Date,
  end: Date,
  scope: Scope,
  reportCurrency?: string
) {
  const scopedTransactions = transactions.filter(item => isInScope(item.scope, scope));
  const cashFlow = reportCurrency
    ? withNetCashFlow(summarizeCashFlowInReportCurrency(scopedTransactions, start, end, reportCurrency))
    : withNetCashFlow(summarizeCashFlow(scopedTransactions, start, end));
  const statementAccounts = accounts.filter(item => isInScope(item.scope, scope));
  const statementDebts = debts.filter(item => isInScope(item.scope, scope));
  const netWorth = calculateNetWorth(statementAccounts, statementDebts);
  const liquidCents = statementAccounts
    .filter(account => account.status === "active" && account.isLiquid)
    .reduce((total, account) => total + account.currentValueCents, 0);

  return { ...cashFlow, ...netWorth, liquidCents };
}

export function transferIntegrityIssues(transactions: ManualTransaction[]) {
  const groups = new Map<string, ManualTransaction[]>();
  transactions
    .filter(transaction => transaction.type === "transfer_in" || transaction.type === "transfer_out")
    .forEach(transaction => {
      if (!transaction.transferGroupId) return;
      const group = groups.get(transaction.transferGroupId) ?? [];
      group.push(transaction);
      groups.set(transaction.transferGroupId, group);
    });

  return Array.from(groups.entries()).flatMap(([groupId, group]: [string, ManualTransaction[]]): string[] => {
    const hasIncoming = group.some((item: ManualTransaction) => item.type === "transfer_in");
    const hasOutgoing = group.some((item: ManualTransaction) => item.type === "transfer_out");
    const totalIncoming = group
      .filter((item: ManualTransaction) => item.type === "transfer_in")
      .reduce((sum: number, item: ManualTransaction) => sum + item.amountCents, 0);
    const totalOutgoing = group
      .filter((item: ManualTransaction) => item.type === "transfer_out")
      .reduce((sum: number, item: ManualTransaction) => sum + item.amountCents, 0);

    if (!hasIncoming || !hasOutgoing || totalIncoming !== totalOutgoing) return [groupId];
    return [];
  });
}
