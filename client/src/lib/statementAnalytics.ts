export type StatementRow = { type: string; amountCents: number; accountId?: number | null; categoryId?: number | null; occurredAt: string | Date; currency?: string; reportCurrency?: string | null; reportAmountCents?: number | null };

export function reportAmount(row: StatementRow, currency: string) {
  if (row.reportCurrency === currency && typeof row.reportAmountCents === "number") return row.reportAmountCents;
  if (!row.currency || row.currency === currency) return row.amountCents;
  return null;
}

export function breakdownByDimension(rows: StatementRow[], dimension: "accountId" | "categoryId", names: Map<number, string>, currency: string, start: Date, end: Date) {
  const map = new Map<number | string, { name: string; incomeCents: number; expenseCents: number; netCents: number; pendingConversionCount: number }>();
  rows.filter(row => { const date = new Date(row.occurredAt); return date >= start && date < end && (row.type === "income" || row.type === "expense"); }).forEach(row => {
    const amount = reportAmount(row, currency);
    const key = row[dimension] ?? "unassigned";
    const current = map.get(key) ?? { name: key === "unassigned" ? "Sin asignar" : names.get(Number(key)) ?? `#${key}`, incomeCents: 0, expenseCents: 0, netCents: 0, pendingConversionCount: 0 };
    if (amount === null) current.pendingConversionCount += 1;
    else if (row.type === "income") current.incomeCents += amount;
    else current.expenseCents += amount;
    current.netCents = current.incomeCents - current.expenseCents;
    map.set(key, current);
  });
  return Array.from(map.values()).sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents));
}

export function compareStatementMetrics(first: { incomeCents: number; expenseCents: number; netCashFlowCents: number; assetCents: number; liabilityCents: number; netWorthCents: number; liquidCents: number }, second: typeof first) {
  return (Object.keys(first) as (keyof typeof first)[]).map(metric => ({ metric, first: first[metric], second: second[metric], delta: second[metric] - first[metric], percent: first[metric] === 0 ? null : ((second[metric] - first[metric]) / Math.abs(first[metric])) * 100 }));
}
