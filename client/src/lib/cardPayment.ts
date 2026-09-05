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

export type CardPaymentMovement = {
  id: number;
  type: string;
  transferGroupId?: string | null;
  creditCardId?: number | null;
};

export function cardPaymentTransactionIds<T extends CardPaymentMovement>(records: T[]) {
  const paymentGroups = new Set(records.filter(record => record.type === "transfer_in" && record.creditCardId && record.transferGroupId).map(record => record.transferGroupId as string));
  return new Set(records.filter(record => record.transferGroupId && paymentGroups.has(record.transferGroupId)).map(record => record.id));
}

export function isValidCardPayment({ card, source, amountCents }: { card: CardPaymentCard | undefined; source: CardPaymentAccount | undefined; amountCents: number }) {
  return Boolean(
    card &&
      source &&
      card.status === "active" &&
      source.status === "active" &&
      card.currency === source.currency &&
      Number.isInteger(amountCents) &&
      amountCents > 0,
  );
}
