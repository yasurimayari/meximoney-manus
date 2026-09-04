import { describe, expect, it } from "vitest";
import { calculatePatrimonySummary } from "./patrimonySummary";

describe("calculatePatrimonySummary", () => {
  it("calcula activos, pasivos y patrimonio neto con la moneda seleccionada", () => {
    expect(calculatePatrimonySummary({
      currency: "MXN",
      accounts: [
        { currentBalanceCents: 100_000, currency: "MXN", status: "active" },
        { currentBalanceCents: 50_000, currency: "MXN", status: "closed" },
      ],
      investments: [
        { valueCents: 75_000, currency: "MXN", includeInNetWorth: true, status: "active" },
        { valueCents: 20_000, currency: "MXN", includeInNetWorth: false, status: "active" },
      ],
      debts: [{ balanceCents: 40_000, currency: "MXN", status: "active" }],
      creditCards: [{ balanceCents: 10_000, currency: "MXN", status: "active" }],
    })).toEqual({ assetCents: 175_000, liabilityCents: 50_000, netWorthCents: 125_000 });
  });

  it("excluye cierres, pagos y monedas distintas sin convertir datos", () => {
    expect(calculatePatrimonySummary({
      currency: "MXN",
      accounts: [{ currentBalanceCents: 80_000, currency: "USD", status: "active" }],
      investments: [{ valueCents: 90_000, currency: "MXN", includeInNetWorth: true, status: "closed" }],
      debts: [
        { balanceCents: 12_000, currency: "MXN", status: "paid" },
        { balanceCents: 25_000, currency: "MXN", status: "review" },
      ],
      creditCards: [
        { balanceCents: 9_000, currency: "MXN", status: "closed" },
        { balanceCents: -500, currency: "MXN", status: "active" },
      ],
    })).toEqual({ assetCents: 0, liabilityCents: 25_000, netWorthCents: -25_000 });
  });
});
