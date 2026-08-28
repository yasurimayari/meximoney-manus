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
    if (account.currentBalanceCents >= 0) row.positiveCents += account.currentBalanceCents;
    else row.negativeCents += Math.abs(account.currentBalanceCents);
  });
  liabilities.forEach(liability => {
    const row = rowFor(liability.currency);
    if (liability.balanceCents >= 0) row.negativeCents += liability.balanceCents;
    else row.positiveCents += Math.abs(liability.balanceCents);
  });
  return Array.from(byCurrency.values()).sort((left, right) => left.currency.localeCompare(right.currency));
}
