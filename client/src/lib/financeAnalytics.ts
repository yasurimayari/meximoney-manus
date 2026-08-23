export type FinanceSnapshot = any;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlySeries(snapshot: FinanceSnapshot, months: number) {
  const now = new Date();
  const anchors = Array.from({ length: months }, (_, index) => new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1));
  return anchors.map(anchor => {
    const key = monthKey(anchor);
    const transactions = snapshot.transactions.filter((transaction: any) => monthKey(new Date(transaction.occurredAt)) === key);
    const incomeCents = transactions.filter((transaction: any) => transaction.type === "income").reduce((total: number, transaction: any) => total + transaction.amountCents, 0);
    const expenseCents = transactions.filter((transaction: any) => transaction.type === "expense").reduce((total: number, transaction: any) => total + transaction.amountCents, 0);
    return {
      key,
      label: anchor.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
      ingresos: incomeCents / 100,
      gastos: expenseCents / 100,
      ahorro: (incomeCents - expenseCents) / 100,
    };
  });
}

export function buildExpenseCategories(snapshot: FinanceSnapshot) {
  const categoryNames = new Map<number, string>(snapshot.categories.map((category: any) => [category.id, category.name]));
  const values = new Map<string, number>();
  snapshot.transactions.filter((transaction: any) => transaction.type === "expense").forEach((transaction: any) => {
    const label = categoryNames.get(transaction.categoryId) || "Sin clasificar";
    values.set(label, (values.get(label) || 0) + transaction.amountCents / 100);
  });
  return Array.from(values.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
}

export function buildAssetAllocation(snapshot: FinanceSnapshot) {
  const labels: Record<string, string> = { cash: "Efectivo", bank: "Cuentas", investment: "Inversiones", pension: "Jubilación", property: "Inmuebles", business: "Empresa", other: "Otros" };
  const values = new Map<string, number>();
  snapshot.accounts.filter((account: any) => account.status === "active").forEach((account: any) => {
    const label = labels[account.type] || "Otros";
    values.set(label, (values.get(label) || 0) + account.currentValueCents / 100);
  });
  return Array.from(values.entries()).map(([name, value]) => ({ name, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
}

export function investmentValue(snapshot: FinanceSnapshot) {
  return snapshot.accounts.filter((account: any) => account.status === "active" && ["investment", "pension"].includes(account.type)).reduce((total: number, account: any) => total + account.currentValueCents, 0);
}
