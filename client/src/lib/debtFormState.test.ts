import { describe, expect, it } from "vitest";
import { debtFormState } from "./debtFormState";

describe("debtFormState", () => {
  it("precarga todos los campos del préstamo Klar", () => {
    const form = debtFormState({
      id: 10,
      name: "Préstamo Klar",
      creditor: "Klar",
      type: "loan",
      loanKind: "personal",
      scope: "personal",
      entityId: null,
      projectId: null,
      balanceCents: 1_170_700,
      originalAmountCents: 1_000_000,
      installmentCents: 371_992,
      installmentCount: 3,
      financedItem: null,
      purchasedAt: null,
      interestRateBps: 10500,
      moratoriumRateBps: 2400,
      overdueSinceAt: new Date("2026-07-10T12:00:00Z"),
      minimumPaymentCents: 371_992,
      nextDueAt: new Date("2026-09-10T12:00:00Z"),
      endDate: null,
      priority: "high",
      notes: "Pago retrasado",
      currency: "MXN",
    });
    expect(form).toMatchObject({ name: "Préstamo Klar", creditor: "Klar", balance: "11707.00", original: "10000.00", installment: "3719.92", installmentCount: "3", rate: "105.00", moratoriumRate: "24.00", minimum: "3719.92", priority: "high", notes: "Pago retrasado" });
    expect(form.purchasedAt).toBe("");
    expect(form.overdueSince).toBe("2026-07-10");
    expect(form.nextDue).toBe("2026-09-10");
  });

  it("devuelve campos seguros para una deuda nueva", () => {
    expect(debtFormState(undefined, "USD")).toMatchObject({ type: "loan", currency: "USD", minimum: "0", notes: "" });
  });
});
