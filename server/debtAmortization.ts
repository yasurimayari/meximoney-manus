export type AmortizationInput = {
  balanceCents: number;
  annualRateBps: number | null;
  paymentCents: number | null;
  maxMonths?: number;
};

export type AmortizationRow = {
  installment: number;
  openingBalanceCents: number;
  regularInterestCents: number;
  plannedPaymentCents: number;
  principalCents: number;
  closingBalanceCents: number;
};

export type AmortizationResult = {
  rows: AmortizationRow[];
  warning: string | null;
  totalProjectedInterestCents: number;
};

export function debtPaymentBreakdownIsValid(input: { totalPaymentCents: number; principalCents: number; interestCents: number; lateInterestCents: number; feeCents: number }) {
  const values = [input.totalPaymentCents, input.principalCents, input.interestCents, input.lateInterestCents, input.feeCents];
  return values.every(value => Number.isInteger(value) && value >= 0)
    && input.principalCents + input.interestCents + input.lateInterestCents + input.feeCents === input.totalPaymentCents;
}

export function buildManualAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  const balanceCents = Math.max(0, Math.round(input.balanceCents));
  const annualRateBps = Math.max(0, Math.round(input.annualRateBps ?? 0));
  const paymentCents = Math.max(0, Math.round(input.paymentCents ?? 0));
  const maxMonths = Math.min(600, Math.max(1, Math.round(input.maxMonths ?? 120)));
  if (!balanceCents) return { rows: [], warning: null, totalProjectedInterestCents: 0 };
  if (!paymentCents) return { rows: [], warning: "Agrega un pago mensual de referencia para proyectar la amortización.", totalProjectedInterestCents: 0 };

  const rows: AmortizationRow[] = [];
  let remaining = balanceCents;
  let totalProjectedInterestCents = 0;
  for (let installment = 1; installment <= maxMonths && remaining > 0; installment += 1) {
    const regularInterestCents = Math.round((remaining * annualRateBps) / 120_000);
    if (paymentCents <= regularInterestCents) {
      return { rows, warning: "El pago mensual de referencia no cubre el interés ordinario proyectado; registra las condiciones reales antes de usar este escenario.", totalProjectedInterestCents };
    }
    const plannedPaymentCents = Math.min(paymentCents, remaining + regularInterestCents);
    const principalCents = plannedPaymentCents - regularInterestCents;
    const closingBalanceCents = Math.max(0, remaining - principalCents);
    rows.push({ installment, openingBalanceCents: remaining, regularInterestCents, plannedPaymentCents, principalCents, closingBalanceCents });
    totalProjectedInterestCents += regularInterestCents;
    remaining = closingBalanceCents;
  }
  return {
    rows,
    warning: remaining > 0 ? `El escenario se limita a ${maxMonths} mensualidades; ajusta el plazo o pago de referencia para ver más periodos.` : null,
    totalProjectedInterestCents,
  };
}
