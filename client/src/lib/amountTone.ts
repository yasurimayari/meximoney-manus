export type AmountTone = "positive" | "negative" | "neutral";

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

export function signedTransactionCents(type: string, amountCents: number) {
  const amount = Math.abs(Number(amountCents) || 0);
  return type === "expense" || type === "transfer_out" ? -amount : amount;
}
