export function financedAssetAmounts(purchaseValueCents: number, cashContributionCents: number) {
  if (!Number.isInteger(purchaseValueCents) || purchaseValueCents < 0) throw new Error("El valor de compra debe ser un entero no negativo.");
  if (!Number.isInteger(cashContributionCents) || cashContributionCents < 0) throw new Error("El aporte en efectivo debe ser un entero no negativo.");
  return {
    purchaseValueCents,
    cashContributionCents,
    financedAmountCents: Math.max(0, purchaseValueCents - cashContributionCents),
  };
}
