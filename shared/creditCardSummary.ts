export type CreditCardSummaryCard = {
  status: "active" | "paused" | "closed";
  currency: string;
  balanceCents: number;
  creditLimitCents: number;
  issuer?: string | null;
};

export function summarizeCreditCards(cards: CreditCardSummaryCard[], reportCurrency: string) {
  const sameCurrency = cards.filter(card => card.currency === reportCurrency && card.status !== "closed");
  const usableCards = sameCurrency.filter(card => card.status === "active");
  const payableCents = sameCurrency.reduce((sum, card) => sum + Math.max(0, card.balanceCents), 0);
  const availableCents = usableCards.reduce((sum, card) => sum + Math.max(0, card.creditLimitCents - Math.max(0, card.balanceCents)), 0);
  const limitCents = sameCurrency.reduce((sum, card) => sum + Math.max(0, card.creditLimitCents), 0);
  const utilizationPercent = limitCents > 0 ? (payableCents / limitCents) * 100 : null;
  const byIssuer = new Map<string, { issuer: string; payableCents: number; availableCents: number; limitCents: number; countedCards: number; usableCards: number }>();
  for (const card of sameCurrency) {
    const issuer = card.issuer?.trim() || "Entidad no especificada";
    const current = byIssuer.get(issuer) ?? { issuer, payableCents: 0, availableCents: 0, limitCents: 0, countedCards: 0, usableCards: 0 };
    const balanceCents = Math.max(0, card.balanceCents);
    current.payableCents += balanceCents;
    current.limitCents += Math.max(0, card.creditLimitCents);
    current.availableCents += card.status === "active" ? Math.max(0, card.creditLimitCents - balanceCents) : 0;
    current.countedCards += 1;
    current.usableCards += card.status === "active" ? 1 : 0;
    byIssuer.set(issuer, current);
  }
  const entities = Array.from(byIssuer.values()).map(item => ({ ...item, utilizationPercent: item.limitCents > 0 ? (item.payableCents / item.limitCents) * 100 : null })).sort((left, right) => right.payableCents - left.payableCents);
  return { payableCents, availableCents, limitCents, utilizationPercent, utilizationBarPercent: utilizationPercent === null ? 0 : Math.min(100, Math.max(0, utilizationPercent)), countedCards: sameCurrency.length, usableCards: usableCards.length, entities };
}
