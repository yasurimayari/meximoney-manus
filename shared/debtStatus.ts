export type DebtStatusDebt = {
  balanceCents: number;
  originalAmountCents: number | null;
  nextDueAt: Date | string | number | null;
};

export type DebtStatusPayment = {
  principalCents: number;
  interestCents?: number | null;
  lateInterestCents?: number | null;
  feeCents?: number | null;
};

export type DebtStatusAdjustment = {
  type: "late_interest" | "finance_charge" | "other_charge" | "correction" | string;
  amountCents: number;
};

export type DebtStatusSummary = {
  originalAmountCents: number;
  principalPaidCents: number;
  regularInterestPaidCents: number;
  lateInterestPaidCents: number;
  feesPaidCents: number;
  lateInterestAccruedCents: number;
  financeChargesAccruedCents: number;
  otherChargesAccruedCents: number;
  correctionsCents: number;
  documentedAccruedCents: number;
  untrackedIncreaseCents: number;
  overdue: boolean;
};

function timestamp(value: DebtStatusDebt["nextDueAt"]) {
  if (value == null) return null;
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

export function summarizeDebtStatus(
  debt: DebtStatusDebt,
  payments: DebtStatusPayment[] = [],
  adjustments: DebtStatusAdjustment[] = [],
  asOf = Date.now(),
): DebtStatusSummary {
  const originalAmountCents = Math.max(0, Math.round(debt.originalAmountCents ?? debt.balanceCents));
  const principalPaidCents = payments.reduce((sum, payment) => sum + Math.max(0, Math.round(payment.principalCents || 0)), 0);
  const regularInterestPaidCents = payments.reduce((sum, payment) => sum + Math.max(0, Math.round(payment.interestCents || 0)), 0);
  const lateInterestPaidCents = payments.reduce((sum, payment) => sum + Math.max(0, Math.round(payment.lateInterestCents || 0)), 0);
  const feesPaidCents = payments.reduce((sum, payment) => sum + Math.max(0, Math.round(payment.feeCents || 0)), 0);
  const lateInterestAccruedCents = adjustments.filter(item => item.type === "late_interest").reduce((sum, item) => sum + item.amountCents, 0);
  const financeChargesAccruedCents = adjustments.filter(item => item.type === "finance_charge").reduce((sum, item) => sum + item.amountCents, 0);
  const otherChargesAccruedCents = adjustments.filter(item => item.type === "other_charge").reduce((sum, item) => sum + item.amountCents, 0);
  const correctionsCents = adjustments.filter(item => item.type === "correction").reduce((sum, item) => sum + item.amountCents, 0);
  const documentedAccruedCents = lateInterestAccruedCents + financeChargesAccruedCents + otherChargesAccruedCents + correctionsCents;
  const expectedBalanceBeforeAccrued = Math.max(0, originalAmountCents - principalPaidCents);
  const untrackedIncreaseCents = Math.max(0, debt.balanceCents - expectedBalanceBeforeAccrued - documentedAccruedCents);
  const dueAt = timestamp(debt.nextDueAt);

  return {
    originalAmountCents,
    principalPaidCents,
    regularInterestPaidCents,
    lateInterestPaidCents,
    feesPaidCents,
    lateInterestAccruedCents,
    financeChargesAccruedCents,
    otherChargesAccruedCents,
    correctionsCents,
    documentedAccruedCents,
    untrackedIncreaseCents,
    overdue: dueAt !== null && dueAt < asOf && debt.balanceCents > 0,
  };
}

export function debtBalanceLabel(summary: DebtStatusSummary) {
  if (summary.untrackedIncreaseCents > 0) return "Saldo actualizado: documenta la diferencia";
  if (summary.lateInterestAccruedCents > 0 || summary.lateInterestPaidCents > 0) return "Incluye intereses por atraso";
  return "Saldo pendiente";
}
