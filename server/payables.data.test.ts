import { describe, expect, it } from "vitest";
import { payableSettlement } from "./routers";

describe("payableSettlement", () => {
  const paidAt = new Date("2026-08-24T12:00:00.000Z");

  it("mantiene pendiente el saldo después de un pago parcial", () => {
    expect(payableSettlement({ amountCents: 10_000, dueAt: null }, [{ amountCents: 3_000, linkedTransactionId: null, paidAt }])).toMatchObject({ paidCents: 3_000, remainingCents: 7_000, status: "pending" });
  });

  it("distingue una CxP pagada de una CxP conciliada con gasto real", () => {
    const payment = { amountCents: 10_000, linkedTransactionId: null, paidAt };
    expect(payableSettlement({ amountCents: 10_000, dueAt: null }, [payment]).status).toBe("paid");
    expect(payableSettlement({ amountCents: 10_000, dueAt: null }, [{ ...payment, linkedTransactionId: 28 }]).status).toBe("reconciled");
  });

  it("marca vencida una CxP con saldo y fecha de vencimiento pasada", () => {
    expect(payableSettlement({ amountCents: 10_000, dueAt: new Date("2020-01-01T00:00:00.000Z") }, []).status).toBe("overdue");
  });
});
