export function relatedMovements(transactions: any[], type: "account" | "creditCard" | "debt", id: number, debtPayments: any[] = []) {
  const paymentTransactionIds = type === "debt" ? new Set(debtPayments.filter(payment => payment.debtId === id && payment.linkedTransactionId).map(payment => payment.linkedTransactionId)) : new Set<number>();
  return transactions
    .filter(transaction => type === "account" ? transaction.accountId === id : type === "creditCard" ? transaction.creditCardId === id : transaction.debtId === id || paymentTransactionIds.has(transaction.id))
    .slice()
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}
