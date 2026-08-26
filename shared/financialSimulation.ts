import { reportedAmountCents } from "../server/finance";

export type DebtStrategy = "avalanche" | "snowball";

export type SimulationDebt = {
  id: string;
  name: string;
  source: "debt" | "credit_card";
  balanceCents: number;
  interestRateBps: number | null;
  minimumPaymentCents: number;
};

export type DebtSimulation = {
  strategy: DebtStrategy;
  months: number;
  totalInterestCents: number;
  remainingBalanceCents: number;
  firstPriorityDebtId: string | null;
  invalidDebtNames: string[];
  cappedAtMaximum: boolean;
};

function sameMonth(value: Date | string, period: Date) {
  const date = new Date(value);
  return date.getFullYear() === period.getFullYear() && date.getMonth() === period.getMonth();
}

export function collectSimulationDebts(snapshot: any, reportCurrency: string) {
  const included: SimulationDebt[] = [];
  const excludedNames: string[] = [];
  for (const debt of snapshot.debts ?? []) {
    if (debt.status !== "active" && debt.status !== "review") continue;
    if (debt.currency !== reportCurrency) { excludedNames.push(debt.name); continue; }
    included.push({ id: `debt-${debt.id}`, name: debt.name, source: "debt", balanceCents: debt.balanceCents, interestRateBps: debt.interestRateBps, minimumPaymentCents: debt.minimumPaymentCents });
  }
  for (const card of snapshot.creditCards ?? []) {
    if (card.status !== "active") continue;
    if (card.currency !== reportCurrency) { excludedNames.push(card.name); continue; }
    included.push({ id: `card-${card.id}`, name: card.name, source: "credit_card", balanceCents: card.balanceCents, interestRateBps: card.interestRateBps, minimumPaymentCents: card.minimumPaymentCents });
  }
  return { included, excludedNames };
}

function sortDebts(debts: SimulationDebt[], strategy: DebtStrategy) {
  return debts.slice().sort((left, right) => {
    const primary = strategy === "avalanche"
      ? (right.interestRateBps ?? -1) - (left.interestRateBps ?? -1)
      : left.balanceCents - right.balanceCents;
    if (primary !== 0) return primary;
    const secondary = strategy === "avalanche" ? left.balanceCents - right.balanceCents : (right.interestRateBps ?? -1) - (left.interestRateBps ?? -1);
    return secondary !== 0 ? secondary : left.name.localeCompare(right.name);
  });
}

export function simulateDebtPayoff(debts: SimulationDebt[], strategy: DebtStrategy, extraPaymentCents: number, maxMonths = 600): DebtSimulation {
  const invalidDebtNames = debts.filter(debt => debt.balanceCents > 0 && (debt.interestRateBps === null || debt.minimumPaymentCents < 0)).map(debt => debt.name);
  const eligible = debts.filter(debt => debt.balanceCents > 0 && debt.interestRateBps !== null && debt.minimumPaymentCents >= 0).map(debt => ({ ...debt, balanceCents: debt.balanceCents }));
  const priority = sortDebts(eligible, strategy);
  let totalInterestCents = 0;
  let months = 0;
  while (eligible.some(debt => debt.balanceCents > 0) && months < maxMonths) {
    months += 1;
    for (const debt of eligible) {
      if (!debt.balanceCents) continue;
      const interest = Math.max(0, Math.round((debt.balanceCents * (debt.interestRateBps ?? 0)) / 120000));
      debt.balanceCents += interest;
      totalInterestCents += interest;
    }
    for (const debt of eligible) {
      const payment = Math.min(debt.balanceCents, debt.minimumPaymentCents);
      debt.balanceCents -= payment;
    }
    let extraAvailable = Math.max(0, extraPaymentCents);
    for (const debt of sortDebts(eligible.filter(item => item.balanceCents > 0), strategy)) {
      if (!extraAvailable) break;
      const payment = Math.min(debt.balanceCents, extraAvailable);
      debt.balanceCents -= payment;
      extraAvailable -= payment;
    }
  }
  const remainingBalanceCents = eligible.reduce((total, debt) => total + debt.balanceCents, 0);
  return { strategy, months, totalInterestCents, remainingBalanceCents, firstPriorityDebtId: priority[0]?.id ?? null, invalidDebtNames, cappedAtMaximum: remainingBalanceCents > 0 && months === maxMonths };
}

export function buildCashFlowBaseline(snapshot: any, period: Date, reportCurrency: string) {
  let incomeCents = 0;
  let expenseCents = 0;
  let excludedForCurrencyCount = 0;
  for (const transaction of snapshot.transactions ?? []) {
    if (transaction.reviewStatus !== "approved" || !sameMonth(transaction.occurredAt, period) || (transaction.type !== "income" && transaction.type !== "expense")) continue;
    const amount = reportedAmountCents(transaction, reportCurrency);
    if (amount === null) { excludedForCurrencyCount += 1; continue; }
    if (transaction.type === "income") incomeCents += amount;
    else expenseCents += amount;
  }
  return { incomeCents, expenseCents, netCashFlowCents: incomeCents - expenseCents, excludedForCurrencyCount };
}

export function applyCashFlowScenario(baseline: { incomeCents: number; expenseCents: number }, incomeAdjustmentCents: number, expenseAdjustmentCents: number, debtExtraCents: number) {
  const incomeCents = baseline.incomeCents + incomeAdjustmentCents;
  const expenseCents = baseline.expenseCents + expenseAdjustmentCents;
  return { incomeCents, expenseCents, debtExtraCents, netCashFlowCents: incomeCents - expenseCents - debtExtraCents };
}

export function allocateSurplus(surplusCents: number, policy: { reserveBps: number; debtBps: number; savingsBps: number; investmentBps: number }) {
  const debtCents = Math.floor((surplusCents * policy.debtBps) / 10000);
  const savingsCents = Math.floor((surplusCents * policy.savingsBps) / 10000);
  const investmentCents = Math.floor((surplusCents * policy.investmentBps) / 10000);
  const reserveCents = surplusCents - debtCents - savingsCents - investmentCents;
  return { reserveCents, debtCents, savingsCents, investmentCents };
}
