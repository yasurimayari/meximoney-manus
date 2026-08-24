export type ImportableTransaction = {
  type: "income" | "expense" | "transfer_out" | "transfer_in";
  amountCents: number;
  currency: string;
  occurredAt: Date | number;
  accountId: number | null;
  notes: string | null;
};

function normalizedNotes(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function dateKey(value: Date | number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function importFingerprint(row: ImportableTransaction) {
  return [row.type, row.amountCents, row.currency.toUpperCase(), dateKey(row.occurredAt), row.accountId ?? "none", normalizedNotes(row.notes)].join(":");
}

export function findPossibleDuplicates<T extends ImportableTransaction & { id: number }>(row: ImportableTransaction, existing: T[]) {
  const fingerprint = importFingerprint(row);
  return existing.filter(item => importFingerprint(item) === fingerprint).map(item => item.id);
}
