export type ReceivableForFiscal = { id: number; amountCents: number; currency: string };
export type ReceivablePaymentForFiscal = { receivableId: number; amountCents: number; linkedTransactionId: number | null };

export type FiscalCollectionStatus = {
  status: "pending" | "partial_reconciled" | "partial_pending" | "settled_reconciled" | "settled_pending";
  paidCents: number;
  reconciledCents: number;
  pendingReconciliationCents: number;
  remainingCents: number;
};

export function getFiscalCollectionStatus(receivable: ReceivableForFiscal, payments: ReceivablePaymentForFiscal[]): FiscalCollectionStatus {
  const relatedPayments = payments.filter(payment => payment.receivableId === receivable.id);
  const paidCents = relatedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const reconciledCents = relatedPayments.filter(payment => payment.linkedTransactionId !== null).reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingReconciliationCents = Math.max(0, paidCents - reconciledCents);
  const remainingCents = Math.max(0, receivable.amountCents - paidCents);

  const status = paidCents === 0
    ? "pending"
    : remainingCents === 0
      ? pendingReconciliationCents === 0 ? "settled_reconciled" : "settled_pending"
      : pendingReconciliationCents === 0 ? "partial_reconciled" : "partial_pending";

  return { status, paidCents, reconciledCents, pendingReconciliationCents, remainingCents };
}
