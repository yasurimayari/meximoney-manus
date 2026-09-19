export function relatedMovements(transactions: any[], type: "account" | "creditCard" | "debt", id: number, debtPayments: any[] = []) {
  const paymentTransactionIds = type === "debt" ? new Set(debtPayments.filter(payment => payment.debtId === id && payment.linkedTransactionId).map(payment => payment.linkedTransactionId)) : new Set<number>();
  return transactions
    .filter(transaction => type === "account" ? transaction.accountId === id : type === "creditCard" ? transaction.creditCardId === id : transaction.debtId === id || paymentTransactionIds.has(transaction.id))
    .slice()
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}

export type DerivedAccountBalance = {
  referenceBalanceCents: number;
  movementDeltaCents: number;
  currentBalanceCents: number;
  includedMovementCount: number;
  referenceDate: Date | string | null;
  reconstructedFromHistory: boolean;
};

function isConfirmedMovement(transaction: any) {
  return transaction.status !== "draft" && transaction.reviewStatus !== "draft" && transaction.reviewStatus !== "pending_review";
}

export type AccuracySummary = {
  confirmedCount: number;
  paymentLinkedCount: number;
  paymentCoveragePercent: number | null;
  accountMovementCount: number;
  reconciledAccountMovementCount: number;
  reconciliationCoveragePercent: number | null;
  pendingReviewCount: number;
  missingPaymentMethodCount: number;
};

function isPrecisionConfirmed(transaction: any) {
  return transaction.status === "confirmed" && transaction.reviewStatus !== "draft" && transaction.reviewStatus !== "pending_review";
}

function percentage(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : null;
}

export function buildAccuracySummary(transactions: any[]): AccuracySummary {
  const confirmed = transactions.filter(isPrecisionConfirmed);
  const paymentLinked = confirmed.filter(transaction => transaction.accountId !== null && transaction.accountId !== undefined || transaction.creditCardId !== null && transaction.creditCardId !== undefined);
  const accountMovements = confirmed.filter(transaction => transaction.accountId !== null && transaction.accountId !== undefined);
  const reconciledAccountMovements = accountMovements.filter(transaction => Boolean(transaction.reconciledAt));
  const pendingReview = transactions.filter(transaction => !isPrecisionConfirmed(transaction));
  const missingPaymentMethod = confirmed.filter(transaction => transaction.accountId === null || transaction.accountId === undefined).filter(transaction => transaction.creditCardId === null || transaction.creditCardId === undefined);
  return {
    confirmedCount: confirmed.length,
    paymentLinkedCount: paymentLinked.length,
    paymentCoveragePercent: percentage(paymentLinked.length, confirmed.length),
    accountMovementCount: accountMovements.length,
    reconciledAccountMovementCount: reconciledAccountMovements.length,
    reconciliationCoveragePercent: percentage(reconciledAccountMovements.length, accountMovements.length),
    pendingReviewCount: pendingReview.length,
    missingPaymentMethodCount: missingPaymentMethod.length,
  };
}

function movementAmountDelta(transaction: any) {
  const amountCents = Number(transaction.amountCents ?? 0);
  return transaction.type === "income" || transaction.type === "transfer_in" ? amountCents : transaction.type === "expense" || transaction.type === "transfer_out" ? -amountCents : 0;
}

export function deriveAccountBalance(account: { id: number; currentValueCents: number | string; manualValueCents?: number | string | null; valuationDate?: Date | string | null }, transactions: any[]): DerivedAccountBalance {
  const referenceDate = account.valuationDate ?? null;
  const referenceTime = referenceDate ? new Date(referenceDate).getTime() : Number.NaN;
  const referenceBalanceCents = Number(account.manualValueCents ?? account.currentValueCents ?? 0);
  const accountMovements = transactions.filter(transaction => transaction.accountId === account.id && isConfirmedMovement(transaction));
  const reconstructedFromHistory = referenceBalanceCents === 0 && accountMovements.length > 0;
  const movements = accountMovements.filter(transaction => reconstructedFromHistory || Number.isNaN(referenceTime) || new Date(transaction.occurredAt).getTime() >= referenceTime);
  const movementDeltaCents = movements.reduce((sum, transaction) => sum + movementAmountDelta(transaction), 0);
  return { referenceBalanceCents, movementDeltaCents, currentBalanceCents: referenceBalanceCents + movementDeltaCents, includedMovementCount: movements.length, referenceDate, reconstructedFromHistory };
}

export function balanceSignal(valueCents: number | string, isLiability = false) {
  const numericValue = Number(valueCents ?? 0);
  if (numericValue === 0) return { tone: "neutral" as const, label: isLiability ? "Sin saldo pendiente" : "Saldo en cero" };
  const isPositive = isLiability ? numericValue < 0 : numericValue > 0;
  return isPositive ? { tone: "positive" as const, label: isLiability ? "Saldo a favor" : "Saldo positivo" } : { tone: "negative" as const, label: isLiability ? "Saldo pendiente" : "Saldo negativo" };
}

export function displayBalanceCents(valueCents: number | string, isLiability = false) {
  const numericValue = Number(valueCents ?? 0);
  if (!isLiability) return numericValue;
  return numericValue > 0 ? -numericValue : Math.abs(numericValue);
}

export type AccountHistoryResource = { id: number; name: string; type: "account" | "creditCard" | "debt" };
export type AccountHistoryRow = { movement: any; resources: AccountHistoryResource[] };

export function buildAccountHistory(transactions: any[], resources: AccountHistoryResource[], debtPayments: any[] = []): AccountHistoryRow[] {
  const rows = new Map<number, AccountHistoryRow>();
  for (const resource of resources) {
    for (const movement of relatedMovements(transactions, resource.type, resource.id, debtPayments)) {
      const existing = rows.get(movement.id);
      if (existing) existing.resources.push(resource);
      else rows.set(movement.id, { movement, resources: [resource] });
    }
  }
  return Array.from(rows.values()).sort((left, right) => new Date(right.movement.occurredAt).getTime() - new Date(left.movement.occurredAt).getTime());
}

export function paginateAccountHistory<T>(items: T[], requestedPage: number, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return { page, totalPages, start, end: Math.min(start + pageSize, items.length), items: items.slice(start, start + pageSize) };
}
