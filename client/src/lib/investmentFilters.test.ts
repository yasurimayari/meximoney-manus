import { describe, expect, it } from "vitest";
import { filterInvestmentsByType } from "./investmentFilters";

describe("filtro de activos por tipo", () => {
  const investments = [{ id: 1, type: "vehicle" }, { id: 2, type: "savings" }, { id: 3, type: "vehicle" }];

  it("mantiene el total o devuelve sólo el tipo solicitado sin mutar los datos", () => {
    expect(filterInvestmentsByType(investments, "all")).toEqual(investments);
    expect(filterInvestmentsByType(investments, "vehicle").map(item => item.id)).toEqual([1, 3]);
    expect(investments).toHaveLength(3);
  });
});
