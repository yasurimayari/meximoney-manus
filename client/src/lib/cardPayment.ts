export type CardPaymentCard = {
  status: string;
  currency: string;
  balanceCents: number;
};

export type CardPaymentAccount = {
  status: string;
  currency: string;
};

export function eligibleCardPaymentSources<T extends CardPaymentAccount>(accounts: T[], card: CardPaymentCard | undefined) {
  return accounts.filter(account => account.status === "active" && (!card || account.currency === card.currency));
}

export function isValidCardPayment({ card, source, amountCents }: { card: CardPaymentCard | undefined; source: CardPaymentAccount | undefined; amountCents: number }) {
  return Boolean(
    card &&
      source &&
      card.status === "active" &&
      source.status === "active" &&
      card.currency === source.currency &&
      card.balanceCents > 0 &&
      Number.isInteger(amountCents) &&
      amountCents > 0 &&
      amountCents <= card.balanceCents,
  );
}
