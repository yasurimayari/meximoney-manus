import { describe, expect, it } from "vitest";
import { applyInvestmentDelta, investmentOperationDelta, totalsFromInvestmentOperations } from "./investmentOperations";

describe("efecto patrimonial de operaciones de inversión", () => {
  it("incrementa costo y valor con una aportación", () => {
    expect(applyInvestmentDelta({ costBasisCents: 500_00, currentValueCents: 500_00 }, investmentOperationDelta("contribution", 500_00))).toEqual({ costBasisCents: 1_000_00, currentValueCents: 1_000_00 });
  });

  it("protege contra valores negativos y separa el rendimiento del costo", () => {
    expect(applyInvestmentDelta({ costBasisCents: 300_00, currentValueCents: 200_00 }, investmentOperationDelta("withdrawal", 500_00))).toEqual({ costBasisCents: 0, currentValueCents: 0 });
    expect(applyInvestmentDelta({ costBasisCents: 1_000_00, currentValueCents: 1_000_00 }, investmentOperationDelta("yield", 25_00))).toEqual({ costBasisCents: 1_000_00, currentValueCents: 1_025_00 });
  });

  it("reconcilia una posición existente usando todas sus operaciones guardadas", () => {
    expect(totalsFromInvestmentOperations([
      { type: "contribution", amountCents: 500_00 },
      { type: "contribution", amountCents: 500_00 },
      { type: "yield", amountCents: 25_00 },
    ])).toEqual({ costBasisCents: 1_000_00, currentValueCents: 1_025_00 });
  });
});
