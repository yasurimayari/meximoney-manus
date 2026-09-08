import { describe, expect, it } from "vitest";
import { paymentMethodLabel } from "./paymentMethodLabel";

describe("paymentMethodLabel", () => {
  const accounts = [{ id: 1, name: "Santander" }];
  const creditCards = [{ id: 7, name: "Klar" }];

  it("muestra una tarjeta de crédito cuando el movimiento está vinculado a TDC", () => {
    expect(paymentMethodLabel({ creditCardId: 7 }, accounts, creditCards)).toBe("TDC · Klar");
  });

  it("muestra una cuenta cuando no existe una tarjeta asociada", () => {
    expect(paymentMethodLabel({ accountId: 1 }, accounts, creditCards)).toBe("Cuenta · Santander");
  });

  it("prioriza la tarjeta cuando existe un vínculo de tarjeta y cuenta", () => {
    expect(paymentMethodLabel({ accountId: 1, creditCardId: 7 }, accounts, creditCards)).toBe("TDC · Klar");
  });

  it("mantiene un estado explícito cuando no se registró medio de pago", () => {
    expect(paymentMethodLabel({}, accounts, creditCards)).toBe("Sin medio de pago");
  });
});
