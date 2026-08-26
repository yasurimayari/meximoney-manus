export type CreditCardKind = "bank_credit" | "departmental";
export type LoanKind = "not_specified" | "personal" | "automotive" | "mortgage";

export function creditCardKindLabel(kind?: string | null) {
  return kind === "departmental" ? "Tarjeta departamental" : "Tarjeta bancaria";
}

export function normalizeLoanKind(type: string, kind?: string | null): LoanKind {
  if (type === "mortgage") return "mortgage";
  if (type !== "loan") return "not_specified";
  return kind === "personal" || kind === "automotive" ? kind : "not_specified";
}

export function debtKindLabel(type: string, loanKind?: string | null) {
  if (type === "mortgage" || loanKind === "mortgage") return "Préstamo hipotecario";
  if (type === "loan" && loanKind === "automotive") return "Préstamo automotriz";
  if (type === "loan" && loanKind === "personal") return "Préstamo personal";
  if (type === "loan") return "Préstamo bancario";
  if (type === "credit_card") return "Tarjeta departamental";
  if (type === "financed_purchase") return "Compra financiada";
  if (type === "tax") return "Obligación fiscal";
  if (type === "business") return "Obligación empresarial";
  if (type === "family") return "Préstamo familiar";
  return "Otra obligación";
}
