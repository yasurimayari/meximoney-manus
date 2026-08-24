export type InvestmentOperationType = "contribution" | "withdrawal" | "yield" | "valuation_adjustment";

export type InvestmentValueDelta = { costBasisCents: number; currentValueCents: number };

export function investmentOperationDelta(type: InvestmentOperationType, amountCents: number): InvestmentValueDelta {
  if (type === "contribution") return { costBasisCents: amountCents, currentValueCents: amountCents };
  if (type === "withdrawal") return { costBasisCents: -amountCents, currentValueCents: -amountCents };
  if (type === "yield" || type === "valuation_adjustment") return { costBasisCents: 0, currentValueCents: amountCents };
  return { costBasisCents: 0, currentValueCents: 0 };
}

export function applyInvestmentDelta(current: { costBasisCents: number; currentValueCents: number }, delta: InvestmentValueDelta) {
  return {
    costBasisCents: Math.max(0, current.costBasisCents + delta.costBasisCents),
    currentValueCents: Math.max(0, current.currentValueCents + delta.currentValueCents),
  };
}

export function totalsFromInvestmentOperations(operations: Array<{ type: InvestmentOperationType; amountCents: number }>) {
  return operations.reduce((current, operation) => applyInvestmentDelta(current, investmentOperationDelta(operation.type, operation.amountCents)), { costBasisCents: 0, currentValueCents: 0 });
}
