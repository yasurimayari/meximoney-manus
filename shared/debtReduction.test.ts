import { describe, expect, it } from "vitest";
import { calculateDebtReduction } from "./debtReduction";

describe("calculateDebtReduction", () => {
  it("reduce parcialmente y mantiene la financiación activa", () => {
    expect(calculateDebtReduction(10000, 2500)).toEqual({ nextBalanceCents: 7500, status: "active" });
  });

  it("marca pagada una financiación liquidada exactamente", () => {
    expect(calculateDebtReduction(10000, 10000)).toEqual({ nextBalanceCents: 0, status: "paid" });
  });

  it("rechaza importes cero, negativos o superiores al saldo", () => {
    expect(calculateDebtReduction(10000, 0)).toBeNull();
    expect(calculateDebtReduction(10000, 10001)).toBeNull();
    expect(calculateDebtReduction(-1, 100)).toBeNull();
  });
});
