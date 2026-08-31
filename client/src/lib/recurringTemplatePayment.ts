export type RecurringTemplatePaymentInput = {
  type: "income" | "expense";
  accountId: number | null;
  creditCardId: number | null;
};

export function recurringTemplatePayment(input: RecurringTemplatePaymentInput) {
  if (input.type !== "expense") return { accountId: input.accountId, creditCardId: null };
  if (input.creditCardId) return { accountId: null, creditCardId: input.creditCardId };
  return { accountId: input.accountId, creditCardId: null };
}
