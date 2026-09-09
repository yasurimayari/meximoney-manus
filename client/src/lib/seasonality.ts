export const MIN_SEASONAL_MONTHS = 6;

const spanishMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type SeasonalityTransaction = {
  occurredAt: Date | string;
  type: string;
  status?: string | null;
  reviewStatus?: string | null;
  currency?: string | null;
  amountCents?: number | string | null;
  reportCurrency?: string | null;
  reportAmountCents?: number | string | null;
};

export type SeasonalMonth = {
  month: number;
  label: string;
  ingresos: number;
  gastos: number;
  neto: number;
  observedPeriods: number;
  movementCount: number;
};

function comparableAmount(transaction: SeasonalityTransaction, currency: string) {
  if (transaction.reportCurrency === currency && transaction.reportAmountCents !== null && transaction.reportAmountCents !== undefined) return Number(transaction.reportAmountCents);
  if (transaction.currency === currency && transaction.amountCents !== null && transaction.amountCents !== undefined) return Number(transaction.amountCents);
  return null;
}

function isConfirmed(transaction: SeasonalityTransaction) {
  return transaction.status === "confirmed" && transaction.reviewStatus !== "draft" && transaction.reviewStatus !== "pending_review";
}

export function buildSeasonality(transactions: SeasonalityTransaction[], currency: string) {
  const buckets = new Map<number, { income: number; expense: number; movements: number; periods: Set<string> }>();
  const observedPeriods = new Set<string>();

  transactions.forEach(transaction => {
    if (!isConfirmed(transaction) || (transaction.type !== "income" && transaction.type !== "expense")) return;
    const amount = comparableAmount(transaction, currency);
    if (amount === null || !Number.isFinite(amount)) return;
    const date = new Date(transaction.occurredAt);
    if (Number.isNaN(date.getTime())) return;
    const month = date.getMonth();
    const period = `${date.getFullYear()}-${month}`;
    const bucket = buckets.get(month) ?? { income: 0, expense: 0, movements: 0, periods: new Set<string>() };
    if (transaction.type === "income") bucket.income += amount;
    else bucket.expense += amount;
    bucket.movements += 1;
    bucket.periods.add(period);
    buckets.set(month, bucket);
    observedPeriods.add(period);
  });

  const months: SeasonalMonth[] = Array.from(buckets.entries()).sort(([left], [right]) => left - right).map(([month, bucket]) => {
    const observed = bucket.periods.size;
    const ingresos = Math.round(bucket.income / observed);
    const gastos = Math.round(bucket.expense / observed);
    return { month, label: spanishMonths[month], ingresos, gastos, neto: ingresos - gastos, observedPeriods: observed, movementCount: bucket.movements };
  });

  const highestExpenseMonth = months.filter(month => month.gastos > 0).sort((left, right) => right.gastos - left.gastos)[0] ?? null;
  const highestIncomeMonth = months.filter(month => month.ingresos > 0).sort((left, right) => right.ingresos - left.ingresos)[0] ?? null;
  return {
    months,
    observedMonthCount: observedPeriods.size,
    minimumMonthCount: MIN_SEASONAL_MONTHS,
    isSufficient: observedPeriods.size >= MIN_SEASONAL_MONTHS,
    highestExpenseMonth,
    highestIncomeMonth,
  };
}
