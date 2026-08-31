export function calculateDebtReduction(balanceCents: number, principalCents: number) {
  if (!Number.isInteger(balanceCents) || !Number.isInteger(principalCents) || balanceCents < 0 || principalCents <= 0 || principalCents > balanceCents) return null;
  const nextBalanceCents = balanceCents - principalCents;
  return { nextBalanceCents, status: nextBalanceCents === 0 ? "paid" as const : "active" as const };
}
