import { describe, expect, it } from "vitest";
import { findInvestmentLinkableTransactions } from "./investmentMovementSearch";

describe("búsqueda de movimientos para una operación de inversión", () => {
  const transactions = [
    { id: 1, type: "income", amountCents: 50000, currency: "MXN", notes: "Aportación mamá", occurredAt: new Date("2026-08-24T12:00:00Z") },
    { id: 2, type: "expense", amountCents: 30000, currency: "MXN", notes: "Servicio", occurredAt: new Date("2026-08-18T12:00:00Z") },
    { id: 3, type: "income", amountCents: 40000, currency: "USD", notes: "Cliente", occurredAt: new Date("2026-08-20T12:00:00Z") },
  ];

  it("encuentra sólo movimientos de la moneda de la posición por nota, tipo, importe o fecha", () => {
    expect(findInvestmentLinkableTransactions(transactions, "MXN", "mama").map(item => item.id)).toEqual([1]);
    expect(findInvestmentLinkableTransactions(transactions, "MXN", "ingreso").map(item => item.id)).toEqual([1]);
    expect(findInvestmentLinkableTransactions(transactions, "MXN", "500").map(item => item.id)).toEqual([1]);
    expect(findInvestmentLinkableTransactions(transactions, "MXN", "2026-08-24").map(item => item.id)).toEqual([1]);
  });
});
