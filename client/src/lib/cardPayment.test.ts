import { describe, expect, it } from "vitest";
import { eligibleCardPaymentSources, isValidCardPayment } from "./cardPayment";

describe("cardPayment", () => {
  const card = { status: "active", currency: "MXN", balanceCents: 100_000 };

  it("filtra cuentas activas de la misma moneda de la TDC", () => {
    const sources = eligibleCardPaymentSources([
      { id: 1, status: "active", currency: "MXN" },
      { id: 2, status: "active", currency: "USD" },
      { id: 3, status: "closed", currency: "MXN" },
    ], card);
    expect(sources.map(source => source.id)).toEqual([1]);
  });

  it("permite un pago parcial sin crear un gasto adicional", () => {
    expect(isValidCardPayment({ card, source: { status: "active", currency: "MXN" }, amountCents: 40_000 })).toBe(true);
  });

  it("rechaza importes mayores al saldo, monedas distintas o una TDC cerrada", () => {
    expect(isValidCardPayment({ card, source: { status: "active", currency: "MXN" }, amountCents: 100_001 })).toBe(false);
    expect(isValidCardPayment({ card, source: { status: "active", currency: "USD" }, amountCents: 10_000 })).toBe(false);
    expect(isValidCardPayment({ card: { ...card, status: "closed" }, source: { status: "active", currency: "MXN" }, amountCents: 10_000 })).toBe(false);
  });
});
