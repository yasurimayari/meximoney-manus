type PaymentRecord = {
  accountId?: number | null;
  creditCardId?: number | null;
};

type NamedPaymentMethod = {
  id: number;
  name: string;
};

export function paymentMethodLabel(
  record: PaymentRecord,
  accounts: NamedPaymentMethod[],
  creditCards: NamedPaymentMethod[]
) {
  const card = record.creditCardId
    ? creditCards.find(item => item.id === record.creditCardId)
    : undefined;
  if (card) return `TDC · ${card.name}`;

  const account = record.accountId
    ? accounts.find(item => item.id === record.accountId)
    : undefined;
  if (account) return `Cuenta · ${account.name}`;

  return "Sin medio de pago";
}
