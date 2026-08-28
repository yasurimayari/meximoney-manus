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
};

function isConfirmedMovement(transaction: any) {
  return transaction.status !== "draft" && transaction.reviewStatus !== "draft" && transaction.reviewStatus !== "pending_review";
}

function movementAmountDelta(transaction: any) {
  return transaction.type === "income" || transaction.type === "transfer_in" ? transaction.amountCents : transaction.type === "expense" || transaction.type === "transfer_out" ? -transaction.amountCents : 0;
}

export function deriveAccountBalance(account: { id: number; currentValueCents: number; valuationDate?: Date | string | null }, transactions: any[]): DerivedAccountBalance {
  const referenceDate = account.valuationDate ?? null;
  const referenceTime = referenceDate ? new Date(referenceDate).getTime() : Number.NaN;
  const movements = Number.isNaN(referenceTime) ? [] : transactions.filter(transaction => transaction.accountId === account.id && isConfirmedMovement(transaction) && new Date(transaction.occurredAt).getTime() > referenceTime);
  const movementDeltaCents = movements.reduce((sum, transaction) => sum + movementAmountDelta(transaction), 0);
  return { referenceBalanceCents: account.currentValueCents, movementDeltaCents, currentBalanceCents: account.currentValueCents + movementDeltaCents, includedMovementCount: movements.length, referenceDate };
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
