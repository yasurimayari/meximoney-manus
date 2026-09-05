import { describe, expect, it } from "vitest";
import { cardPaymentTransactionIds, eligibleCardPaymentSources, isValidCardPayment } from "./cardPayment";

describe("cardPayment", () => {
  const card = { status: "active", currency: "MXN", balanceCents: 100_000 };

  it("identifica ambas partes de un pago de TDC por su grupo de transferencia", () => {
    const ids = cardPaymentTransactionIds([
      { id: 1, type: "transfer_out", transferGroupId: "payment-1", creditCardId: null },
      { id: 2, type: "transfer_in", transferGroupId: "payment-1", creditCardId: 8 },
      { id: 3, type: "expense", transferGroupId: null, creditCardId: null },
      { id: 4, type: "transfer_out", transferGroupId: "transfer-1", creditCardId: null },
      { id: 5, type: "transfer_in", transferGroupId: "transfer-1", creditCardId: null },
    ]);
    expect(Array.from(ids)).toEqual([1, 2]);
  });

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

  it("permite pagar por encima del saldo o del límite porque puede existir saldo a favor", () => {
    expect(isValidCardPayment({ card, source: { status: "active", currency: "MXN" }, amountCents: 100_001 })).toBe(true);
    expect(isValidCardPayment({ card: { ...card, balanceCents: 0 }, source: { status: "active", currency: "MXN" }, amountCents: 746_281 })).toBe(true);
  });

  it("rechaza monedas distintas, tarjetas cerradas o importes no positivos", () => {
    expect(isValidCardPayment({ card, source: { status: "active", currency: "USD" }, amountCents: 10_000 })).toBe(false);
    expect(isValidCardPayment({ card: { ...card, status: "closed" }, source: { status: "active", currency: "MXN" }, amountCents: 10_000 })).toBe(false);
    expect(isValidCardPayment({ card, source: { status: "active", currency: "MXN" }, amountCents: 0 })).toBe(false);
  });
});
