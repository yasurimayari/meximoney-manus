export type StatementLine = {
  rowNumber: number;
  occurredAt: Date;
  type: "income" | "expense";
  amountCents: number;
  currency: string;
  bankReference: string | null;
  description: string | null;
};

export type ReconciliationTransaction = {
  id: number;
  occurredAt: Date | string;
  type: "income" | "expense" | "transfer_in" | "transfer_out";
  amountCents: number;
  currency: string;
  bankReference?: string | null;
  accountId?: number | null;
  reconciledAt?: Date | string | null;
};

export type StatementMatch = {
  rowNumber: number;
  transactionId: number | null;
  status: "auto_matched" | "unmatched" | "ambiguous";
  reason: "reference_and_amount" | "amount_and_date" | "no_exact_match" | "multiple_exact_matches";
  candidateTransactionIds: number[];
};

export function normalizeBankReference(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function dayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function sameDirection(line: StatementLine, transaction: ReconciliationTransaction) {
  if (line.type === "income") return transaction.type === "income" || transaction.type === "transfer_in";
  return transaction.type === "expense" || transaction.type === "transfer_out";
}

export function matchStatementLines(lines: StatementLine[], transactions: ReconciliationTransaction[], accountId: number) {
  const used = new Set<number>();
  return lines.map<StatementMatch>(line => {
    const available = transactions.filter(transaction => transaction.accountId === accountId && !transaction.reconciledAt && !used.has(transaction.id) && sameDirection(line, transaction) && transaction.amountCents === line.amountCents && transaction.currency.toUpperCase() === line.currency.toUpperCase());
    if (!available.length) return { rowNumber: line.rowNumber, transactionId: null, status: "unmatched", reason: "no_exact_match", candidateTransactionIds: [] };

    const reference = normalizeBankReference(line.bankReference);
    const referenceMatches = reference ? available.filter(transaction => normalizeBankReference(transaction.bankReference) === reference) : [];
    if (referenceMatches.length === 1) {
      used.add(referenceMatches[0].id);
      return { rowNumber: line.rowNumber, transactionId: referenceMatches[0].id, status: "auto_matched", reason: "reference_and_amount", candidateTransactionIds: [referenceMatches[0].id] };
    }
    if (referenceMatches.length > 1) return { rowNumber: line.rowNumber, transactionId: null, status: "ambiguous", reason: "multiple_exact_matches", candidateTransactionIds: referenceMatches.map(item => item.id) };

    const dateMatches = available.filter(transaction => dayKey(transaction.occurredAt) === dayKey(line.occurredAt));
    if (dateMatches.length === 1) {
      used.add(dateMatches[0].id);
      return { rowNumber: line.rowNumber, transactionId: dateMatches[0].id, status: "auto_matched", reason: "amount_and_date", candidateTransactionIds: [dateMatches[0].id] };
    }
    return { rowNumber: line.rowNumber, transactionId: null, status: dateMatches.length > 1 ? "ambiguous" : "unmatched", reason: dateMatches.length > 1 ? "multiple_exact_matches" : "no_exact_match", candidateTransactionIds: dateMatches.map(item => item.id) };
  });
}

export function statementSummary(lines: Array<{ matchStatus: "unmatched" | "auto_matched" | "reconciled" | "ignored"; amountCents: number }>) {
  return lines.reduce((summary, line) => {
    summary.total += 1;
    summary[line.matchStatus] += 1;
    if (line.matchStatus === "unmatched" || line.matchStatus === "ignored") summary.differenceCents += line.amountCents;
    return summary;
  }, { total: 0, auto_matched: 0, reconciled: 0, unmatched: 0, ignored: 0, differenceCents: 0 });
}
