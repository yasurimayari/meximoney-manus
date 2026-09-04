const fromCents = (value: number | null | undefined) => value == null ? "" : (value / 100).toFixed(2);

const dateInput = (value: Date | string | number | null | undefined) => value ? new Date(value).toISOString().slice(0, 10) : "";

export function debtFormState(debt: any | undefined, defaultCurrency = "MXN") {
  if (!debt) return {
    name: "", creditor: "", type: "loan", loanKind: "personal", scope: "personal", entityId: "", projectId: "", balance: "", original: "", installment: "", installmentCount: "", financedItem: "", purchasedAt: "", rate: "", moratoriumRate: "", overdueSince: "", minimum: "0", nextDue: "", endDate: "", priority: "medium", notes: "", currency: defaultCurrency,
  };
  return {
    name: debt.name ?? "",
    creditor: debt.creditor ?? "",
    type: debt.type ?? "loan",
    loanKind: debt.loanKind ?? "personal",
    scope: debt.scope ?? "personal",
    entityId: debt.entityId?.toString() ?? "",
    projectId: debt.projectId?.toString() ?? "",
    balance: fromCents(debt.balanceCents),
    original: fromCents(debt.originalAmountCents),
    installment: fromCents(debt.installmentCents),
    installmentCount: debt.installmentCount?.toString() ?? "",
    financedItem: debt.financedItem ?? "",
    purchasedAt: dateInput(debt.purchasedAt),
    rate: debt.interestRateBps == null ? "" : (debt.interestRateBps / 100).toFixed(2),
    moratoriumRate: debt.moratoriumRateBps == null ? "" : (debt.moratoriumRateBps / 100).toFixed(2),
    overdueSince: dateInput(debt.overdueSinceAt),
    minimum: fromCents(debt.minimumPaymentCents),
    nextDue: dateInput(debt.nextDueAt),
    endDate: dateInput(debt.endDate),
    priority: debt.priority ?? "medium",
    notes: debt.notes ?? "",
    currency: debt.currency ?? defaultCurrency,
  };
}
