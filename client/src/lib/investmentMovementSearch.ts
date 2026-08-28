function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function transactionTypeLabel(type: string) {
  return type === "income" ? "ingreso" : type === "expense" ? "gasto" : type === "transfer_in" ? "traspaso recibido" : type === "transfer_out" ? "traspaso enviado" : type;
}

export function findInvestmentLinkableTransactions(transactions: any[], currency: string, query: string) {
  const search = normalized(query);
  return transactions
    .filter(item => item.currency === currency)
    .slice()
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .filter(item => !search || normalized([new Date(item.occurredAt).toLocaleDateString("es-MX"), new Date(item.occurredAt).toISOString().slice(0, 10), transactionTypeLabel(item.type), String(item.amountCents / 100), item.currency, item.notes].join(" ")).includes(search))
    .slice(0, 100);
}
