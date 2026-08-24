import { describe, expect, it } from "vitest";
import { receivableSettlement } from "./routers";

describe("receivableSettlement", () => {
  const issued = new Date("2026-08-24T12:00:00.000Z");

  it("mantiene el saldo pendiente tras un abono parcial", () => {
    const result = receivableSettlement({ amountCents: 10_000, dueAt: null }, [{ amountCents: 4_000, linkedTransactionId: null, paidAt: issued }]);
    expect(result).toMatchObject({ paidCents: 4_000, remainingCents: 6_000, status: "pending", paidAt: null });
  });

  it("distingue pago total sin conciliar de pago total vinculado a ingreso", () => {
    const payment = { amountCents: 10_000, linkedTransactionId: null, paidAt: issued };
    expect(receivableSettlement({ amountCents: 10_000, dueAt: null }, [payment]).status).toBe("paid");
    expect(receivableSettlement({ amountCents: 10_000, dueAt: null }, [{ ...payment, linkedTransactionId: 72 }]).status).toBe("reconciled");
  });

  it("marca vencida una cuenta pendiente cuyo vencimiento ya pasó", () => {
    const result = receivableSettlement({ amountCents: 10_000, dueAt: new Date("2020-01-01T00:00:00.000Z") }, []);
    expect(result.status).toBe("overdue");
  });
});
