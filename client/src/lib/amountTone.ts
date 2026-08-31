export type AmountTone = "positive" | "negative" | "neutral";
export type AmountSemantic = "income" | "expense" | "asset" | "liability" | "transfer_in" | "transfer_out";

export function amountTone(valueCents: number | null | undefined): AmountTone {
  const value = Number(valueCents ?? 0);
  if (!Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function amountToneClass(valueCents: number | null | undefined) {
  const tone = amountTone(valueCents);
  if (tone === "positive") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "negative") return "text-rose-700 dark:text-rose-400";
  return "text-foreground";
}

export function displayAmountCents(amountCents: number | null | undefined, semantic: AmountSemantic) {
  const amount = Math.abs(Number(amountCents) || 0);
  return semantic === "expense" || semantic === "liability" || semantic === "transfer_out" ? -amount : amount;
}

export function signedTransactionCents(type: string, amountCents: number) {
  return displayAmountCents(amountCents, type === "expense" ? "expense" : type === "transfer_out" ? "transfer_out" : "income");
}
