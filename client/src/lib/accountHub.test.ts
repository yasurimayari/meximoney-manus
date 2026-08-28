import { describe, expect, it } from "vitest";
import { balanceSignal, buildAccountHistory, deriveAccountBalance, paginateAccountHistory, relatedMovements } from "./accountHub";

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

  it("consolida recursos relacionados sin duplicar un movimiento y pagina el historial", () => {
    const history = buildAccountHistory(transactions, [
      { id: 5, name: "Cuenta origen", type: "account" },
      { id: 8, name: "Tarjeta", type: "creditCard" },
    ]);
    expect(history.map(row => row.movement.id)).toEqual([2, 1]);
    expect(history[0]?.resources.map(resource => resource.name)).toEqual(["Cuenta origen", "Tarjeta"]);
    expect(paginateAccountHistory(history, 2, 1)).toMatchObject({ page: 2, totalPages: 2, start: 1, end: 2, items: [history[1]] });
  });

  it("deriva el saldo actual desde la valoración manual y sólo movimientos confirmados posteriores", () => {
    const balance = deriveAccountBalance({ id: 5, currentValueCents: 10000, valuationDate: new Date("2026-08-01T12:00:00Z") }, [
      { id: 1, accountId: 5, type: "income", amountCents: 2500, occurredAt: new Date("2026-08-02T12:00:00Z"), status: "confirmed" },
      { id: 2, accountId: 5, type: "transfer_out", amountCents: 700, occurredAt: new Date("2026-08-03T12:00:00Z"), status: "confirmed" },
      { id: 3, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-04T12:00:00Z"), status: "draft" },
      { id: 4, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-04T12:00:00Z"), reviewStatus: "pending_review" },
      { id: 5, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-01T12:00:00Z"), status: "confirmed" },
    ]);
    expect(balance).toMatchObject({ referenceBalanceCents: 10000, movementDeltaCents: 1800, currentBalanceCents: 11800, includedMovementCount: 2 });
  });

  it("distingue con una señal visible los saldos favorables de cuentas y obligaciones", () => {
    expect(balanceSignal(1200)).toEqual({ tone: "positive", label: "Saldo positivo" });
    expect(balanceSignal(-1200)).toEqual({ tone: "negative", label: "Saldo negativo" });
    expect(balanceSignal(1200, true)).toEqual({ tone: "negative", label: "Saldo pendiente" });
    expect(balanceSignal(0, true)).toEqual({ tone: "neutral", label: "Sin saldo pendiente" });
  });
});
