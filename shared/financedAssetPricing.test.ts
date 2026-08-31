import { describe, expect, it } from "vitest";
import { financedAssetAmounts } from "./financedAssetPricing";

describe("financedAssetAmounts", () => {
  it("recalcula el principal financiado conservando el aporte en efectivo", () => {
    expect(financedAssetAmounts(2250000, 500000)).toEqual({ purchaseValueCents: 2250000, cashContributionCents: 500000, financedAmountCents: 1750000 });
  });

  it("evita un principal negativo cuando el efectivo cubre el valor completo", () => {
    expect(financedAssetAmounts(100000, 120000).financedAmountCents).toBe(0);
  });

  it("rechaza valores no enteros o negativos", () => {
    expect(() => financedAssetAmounts(-1, 0)).toThrow();
    expect(() => financedAssetAmounts(100, 1.5)).toThrow();
  });
});
