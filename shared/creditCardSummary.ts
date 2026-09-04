export type CreditCardSummaryCard = {
  id?: number;
  name?: string;
  status: "active" | "paused" | "closed";
  currency: string;
  balanceCents: number;
  creditLimitCents: number;
  issuer?: string | null;
};

export type CreditCardMovement = {
  creditCardId?: number | null;
  type: "income" | "expense" | "transfer_out" | "transfer_in";
  amountCents: number;
  occurredAt: Date | string | number;
};

export function cardUtilizationPercent(card: Pick<CreditCardSummaryCard, "balanceCents" | "creditLimitCents">) {
  return card.creditLimitCents > 0 ? (Math.max(0, card.balanceCents) / card.creditLimitCents) * 100 : null;
}

export function creditCardUtilizationAlerts(cards: CreditCardSummaryCard[], reportCurrency: string, thresholdPercent = 20) {
  return cards.filter(card => card.status !== "closed" && card.currency === reportCurrency).map(card => ({ ...card, utilizationPercent: cardUtilizationPercent(card) })).filter(card => card.utilizationPercent !== null && card.utilizationPercent > thresholdPercent).sort((left, right) => (right.utilizationPercent ?? 0) - (left.utilizationPercent ?? 0));
}

function movementEffect(movement: CreditCardMovement) {
  if (movement.type === "expense") return Math.max(0, movement.amountCents);
  if (movement.type === "transfer_in") return -Math.max(0, movement.amountCents);
  return 0;
}

export function buildCreditUtilizationHistory(cards: CreditCardSummaryCard[], transactions: CreditCardMovement[], reportCurrency: string, monthCount = 6, now = new Date()) {
  const eligibleCards = cards.filter(card => card.id !== undefined && card.id !== null && card.status !== "closed" && card.currency === reportCurrency && card.creditLimitCents > 0);
  const endNow = now.getTime();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - Math.max(0, monthCount - 1), 1);
  return Array.from({ length: Math.max(1, monthCount) }, (_, index) => {
    const monthStart = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthEnd = Math.min(endNow, nextMonthStart.getTime() - 1);
    const usedCents = eligibleCards.reduce((total, card) => {
      const futureEffect = transactions.filter(movement => movement.creditCardId === card.id && new Date(movement.occurredAt).getTime() > monthEnd && new Date(movement.occurredAt).getTime() <= endNow).reduce((sum, movement) => sum + movementEffect(movement), 0);
      return total + Math.max(0, card.balanceCents - futureEffect);
    }, 0);
    const limitCents = eligibleCards.reduce((total, card) => total + Math.max(0, card.creditLimitCents), 0);
    return { monthStart, label: monthStart.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""), usedCents, limitCents, utilizationPercent: limitCents > 0 ? (usedCents / limitCents) * 100 : null };
  });
}


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
