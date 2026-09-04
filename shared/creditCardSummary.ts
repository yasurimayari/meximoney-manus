export type CreditCardSummaryCard = {
  status: "active" | "paused" | "closed";
  currency: string;
  balanceCents: number;
  creditLimitCents: number;
};

export function summarizeCreditCards(cards: CreditCardSummaryCard[], reportCurrency: string) {
  const sameCurrency = cards.filter(card => card.currency === reportCurrency && card.status !== "closed");
  const usableCards = sameCurrency.filter(card => card.status === "active");
  const payableCents = sameCurrency.reduce((sum, card) => sum + Math.max(0, card.balanceCents), 0);
  const availableCents = usableCards.reduce((sum, card) => sum + Math.max(0, card.creditLimitCents - Math.max(0, card.balanceCents)), 0);
  const limitCents = sameCurrency.reduce((sum, card) => sum + Math.max(0, card.creditLimitCents), 0);
  return { payableCents, availableCents, limitCents, countedCards: sameCurrency.length, usableCards: usableCards.length };
}
