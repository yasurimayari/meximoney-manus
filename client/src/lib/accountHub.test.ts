import { describe, expect, it } from "vitest";
import { relatedMovements } from "./accountHub";

describe("movimientos del centro de cuentas", () => {
  const transactions = [
    { id: 1, accountId: 5, creditCardId: null, debtId: null, occurredAt: new Date("2026-08-01") },
    { id: 2, accountId: 5, creditCardId: 8, debtId: null, occurredAt: new Date("2026-08-03") },
    { id: 3, accountId: 4, creditCardId: null, debtId: null, occurredAt: new Date("2026-08-05") },
  ];

  it("conserva la trazabilidad de la cuenta y de la tarjeta sin crear movimientos", () => {
    expect(relatedMovements(transactions, "account", 5).map(item => item.id)).toEqual([2, 1]);
    expect(relatedMovements(transactions, "creditCard", 8).map(item => item.id)).toEqual([2]);
  });

  it("incluye el gasto aprobado enlazado a un pago de préstamo", () => {
    expect(relatedMovements(transactions, "debt", 12, [{ debtId: 12, linkedTransactionId: 3 }]).map(item => item.id)).toEqual([3]);
  });
});
