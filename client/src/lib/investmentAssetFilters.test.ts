import { describe, expect, it } from "vitest";
import { filterAndSortInvestmentAssets } from "./investmentAssetFilters";

describe("filtros de activos financiados", () => {
  const now = new Date("2026-08-31T12:00:00Z").getTime();
  const assets = [
    { id: 1, name: "Moto", institution: "Coppel", type: "vehicle" },
    { id: 2, name: "Fondo de emergencia", institution: "Plata", type: "savings" },
    { id: 3, name: "Terreno", institution: "Particular", type: "land" },
  ];
  const financed = [
    { investmentId: 1, debt: { name: "Financiación moto", balanceCents: 2250000, nextDueAt: "2026-08-20T12:00:00Z" } },
    { investmentId: 3, debt: { name: "Crédito terreno", balanceCents: 800000, nextDueAt: "2026-09-20T12:00:00Z" } },
  ];

  it("encuentra activos por nombre de financiación y filtra vencidos", () => {
    expect(filterAndSortInvestmentAssets(assets, financed, { type: "all", query: "moto", situation: "overdue", sort: "name", now })).toEqual([assets[0]]);
  });

  it("ordena por saldo pendiente sin mezclar activos no financiados", () => {
    expect(filterAndSortInvestmentAssets(assets, financed, { type: "all", query: "", situation: "with_debt", sort: "balance_desc", now }).map(asset => asset.name)).toEqual(["Moto", "Terreno"]);
  });

  it("filtra por tipo y conserva activos sin financiación", () => {
    expect(filterAndSortInvestmentAssets(assets, financed, { type: "savings", query: "", situation: "without_debt", sort: "name", now })).toEqual([assets[1]]);
  });
});
