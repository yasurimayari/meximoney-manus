export type AccountBalanceChartRow = { currency: string; positiveCents: number; negativeCents: number };

export function buildAccountBalanceChart(accounts: Array<{ currency: string; currentBalanceCents: number }>, liabilities: Array<{ currency: string; balanceCents: number }>): AccountBalanceChartRow[] {
  const byCurrency = new Map<string, AccountBalanceChartRow>();
  const rowFor = (currency: string) => {
    const current = byCurrency.get(currency) ?? { currency, positiveCents: 0, negativeCents: 0 };
    byCurrency.set(currency, current);
    return current;
  };
  accounts.forEach(account => {
    const row = rowFor(account.currency);
    const balanceCents = Number(account.currentBalanceCents ?? 0);
    if (balanceCents >= 0) row.positiveCents += balanceCents;
    else row.negativeCents += Math.abs(balanceCents);
  });
  liabilities.forEach(liability => {
    const row = rowFor(liability.currency);
    const balanceCents = Number(liability.balanceCents ?? 0);
    if (balanceCents >= 0) row.negativeCents += balanceCents;
    else row.positiveCents += Math.abs(balanceCents);
  });
  return Array.from(byCurrency.values()).sort((left, right) => left.currency.localeCompare(right.currency));
}
