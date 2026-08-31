import { describe, expect, it } from "vitest";
import { buildPatrimonyDistribution } from "./patrimonyDistribution";

describe("buildPatrimonyDistribution", () => {
  it("separa activos y obligaciones y conserva sus totales", () => {
    const result = buildPatrimonyDistribution({
      accounts: [{ currentBalanceCents: 100000 }, { currentBalanceCents: -5000 }],
      investments: [{ valueCents: 250000 }],
      debts: [{ balanceCents: 80000 }],
      creditCards: [{ balanceCents: 20000 }],
    });

    expect(result.assetTotalCents).toBe(350000);
    expect(result.liabilityTotalCents).toBe(105000);
    expect(result.entries).toEqual([
      expect.objectContaining({ key: "accounts", kind: "asset", valueCents: 100000 }),
      expect.objectContaining({ key: "accounts-negative", kind: "liability", valueCents: 5000 }),
      expect.objectContaining({ key: "investments", kind: "asset", valueCents: 250000 }),
      expect.objectContaining({ key: "debts", kind: "liability", valueCents: 80000 }),
      expect.objectContaining({ key: "credit-cards", kind: "liability", valueCents: 20000 }),
    ]);
  });

  it("omite categorías sin saldo y contabiliza una cuenta negativa como pasivo", () => {
    const result = buildPatrimonyDistribution({
      accounts: [{ currentBalanceCents: -1200 }],
      investments: [],
      debts: [],
      creditCards: [],
    });

    expect(result.assetTotalCents).toBe(0);
    expect(result.liabilityTotalCents).toBe(1200);
    expect(result.entries).toEqual([
      expect.objectContaining({ key: "accounts-negative", label: "Cuentas y efectivo en negativo", kind: "liability", valueCents: 1200 }),
    ]);
  });
});
