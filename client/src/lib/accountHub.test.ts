import { describe, expect, it } from "vitest";
import { balanceSignal, buildAccuracySummary, buildAccountHistory, deriveAccountBalance, displayBalanceCents, paginateAccountHistory, relatedMovements } from "./accountHub";

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

  it("deriva el saldo actual desde la valoración manual e incluye movimientos confirmados de la fecha de referencia", () => {
    const balance = deriveAccountBalance({ id: 5, currentValueCents: 10000, valuationDate: new Date("2026-08-01T12:00:00Z") }, [
      { id: 1, accountId: 5, type: "income", amountCents: 2500, occurredAt: new Date("2026-08-02T12:00:00Z"), status: "confirmed" },
      { id: 2, accountId: 5, type: "transfer_out", amountCents: 700, occurredAt: new Date("2026-08-03T12:00:00Z"), status: "confirmed" },
      { id: 3, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-04T12:00:00Z"), status: "draft" },
      { id: 4, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-04T12:00:00Z"), reviewStatus: "pending_review" },
      { id: 5, accountId: 5, type: "income", amountCents: 9999, occurredAt: new Date("2026-08-01T12:00:00Z"), status: "confirmed" },
    ]);
    expect(balance).toMatchObject({ referenceBalanceCents: 10000, movementDeltaCents: 11799, currentBalanceCents: 21799, includedMovementCount: 3 });
  });

  it("incluye movimientos confirmados exactamente en la fecha de valoración", () => {
    const balance = deriveAccountBalance({ id: 9, currentValueCents: 50000, valuationDate: new Date("2026-09-05T12:00:00Z") }, [
      { id: 10, accountId: 9, type: "income", amountCents: 12500, occurredAt: new Date("2026-09-05T12:00:00Z"), status: "confirmed" },
      { id: 11, accountId: 9, type: "expense", amountCents: 2500, occurredAt: new Date("2026-09-05T12:00:00Z"), reviewStatus: "approved" },
    ]);
    expect(balance).toMatchObject({ movementDeltaCents: 10000, currentBalanceCents: 60000, includedMovementCount: 2 });
  });

  it("mantiene la semántica visual de deuda y saldo a favor en tarjetas", () => {
    expect(displayBalanceCents(1326181, true)).toBe(-1326181);
    expect(displayBalanceCents(-1326181, true)).toBe(1326181);
    expect(balanceSignal(-1326181, true)).toEqual({ tone: "positive", label: "Saldo a favor" });
  });

  it("reconstruye desde todo el historial cuando la base manual es cero", () => {
    const balance = deriveAccountBalance({ id: 12, currentValueCents: "0", valuationDate: new Date("2026-08-28T12:00:00Z") }, [
      { id: 20, accountId: 12, type: "transfer_in", amountCents: "100000", occurredAt: new Date("2024-06-10T12:00:00Z"), status: "confirmed", reviewStatus: "approved" },
      { id: 21, accountId: 12, type: "income", amountCents: "50000", occurredAt: new Date("2026-08-03T12:00:00Z"), status: "confirmed", reviewStatus: "approved" },
      { id: 22, accountId: 12, type: "expense", amountCents: "25000", occurredAt: new Date("2026-08-29T12:00:00Z"), status: "confirmed", reviewStatus: "approved" },
    ]);
    expect(balance).toMatchObject({ referenceBalanceCents: 0, movementDeltaCents: 125000, currentBalanceCents: 125000, includedMovementCount: 3, reconstructedFromHistory: true });
  });

  it("distingue con una señal visible los saldos favorables de cuentas y obligaciones", () => {
    expect(balanceSignal(1200)).toEqual({ tone: "positive", label: "Saldo positivo" });
    expect(balanceSignal(-1200)).toEqual({ tone: "negative", label: "Saldo negativo" });
    expect(balanceSignal(1200, true)).toEqual({ tone: "negative", label: "Saldo pendiente" });
    expect(balanceSignal(0, true)).toEqual({ tone: "neutral", label: "Sin saldo pendiente" });
  });

  it("resume cobertura de pago y conciliación sólo con movimientos confirmados", () => {
    const summary = buildAccuracySummary([
      { id: 1, status: "confirmed", reviewStatus: "approved", accountId: 7, creditCardId: null, reconciledAt: new Date("2026-09-01") },
      { id: 2, status: "confirmed", reviewStatus: "approved", accountId: null, creditCardId: 4, reconciledAt: null },
      { id: 3, status: "confirmed", reviewStatus: "approved", accountId: 7, creditCardId: null, reconciledAt: null },
      { id: 4, status: "needs_review", reviewStatus: "pending_review", accountId: null, creditCardId: null, reconciledAt: null },
      { id: 5, status: "estimated", reviewStatus: "approved", accountId: null, creditCardId: null, reconciledAt: null },
    ]);
    expect(summary).toEqual({
      confirmedCount: 3,
      paymentLinkedCount: 3,
      paymentCoveragePercent: 100,
      accountMovementCount: 2,
      reconciledAccountMovementCount: 1,
      reconciliationCoveragePercent: 50,
      pendingReviewCount: 2,
      missingPaymentMethodCount: 0,
    });
  });

  it("devuelve cobertura vacía en lugar de porcentajes engañosos sin movimientos aplicables", () => {
    expect(buildAccuracySummary([{ id: 9, status: "needs_review", reviewStatus: "pending_review" }])).toMatchObject({
      paymentCoveragePercent: null,
      reconciliationCoveragePercent: null,
      pendingReviewCount: 1,
    });
  });
});
