export type CreditCardForAlert = {
  id: number;
  name: string;
  currency: string;
  creditLimitCents: number;
  balanceCents: number;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
  status: "active" | "paused" | "closed";
};

export type CreditCardAlertCandidate = {
  type: "credit_card_cutoff" | "credit_card_payment" | "credit_card_overlimit";
  title: string;
  message: string;
  relatedEntityType: "credit_card";
  relatedEntityId: number;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

export function nextMonthlyOccurrence(day: number, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const forMonth = (year: number, month: number) => new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  const currentMonth = forMonth(today.getFullYear(), today.getMonth());
  return currentMonth < today ? forMonth(today.getFullYear(), today.getMonth() + 1) : currentMonth;
}

export function creditCardAlertCandidates(cards: CreditCardForAlert[], now = new Date(), horizonDays = 7): CreditCardAlertCandidate[] {
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizonDays);
  const candidates: CreditCardAlertCandidate[] = [];
  for (const card of cards.filter(card => card.status === "active")) {
    if (card.balanceCents > card.creditLimitCents) {
      candidates.push({ type: "credit_card_overlimit", title: `Sobregiro registrado: ${card.name}`, message: `El saldo supera el límite por ${formatMoney(card.balanceCents - card.creditLimitCents, card.currency)}. Confirma manualmente el saldo, pago y condiciones.`, relatedEntityType: "credit_card", relatedEntityId: card.id });
    }
    if (card.statementClosingDay) {
      const date = nextMonthlyOccurrence(card.statementClosingDay, now);
      if (date <= horizon) candidates.push({ type: "credit_card_cutoff", title: `Corte próximo: ${card.name}`, message: `El corte registrado es el ${date.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Revisa gastos y saldo de forma manual.`, relatedEntityType: "credit_card", relatedEntityId: card.id });
    }
    if (card.paymentDueDay) {
      const date = nextMonthlyOccurrence(card.paymentDueDay, now);
      if (date <= horizon) candidates.push({ type: "credit_card_payment", title: `Pago próximo: ${card.name}`, message: `La fecha de pago registrada es el ${date.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. Meximoney no ejecuta pagos.`, relatedEntityType: "credit_card", relatedEntityId: card.id });
    }
  }
  return candidates;
}
