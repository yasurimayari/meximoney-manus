import { describe, expect, it } from "vitest";
import { getFiscalCollectionStatus } from "./receivableFiscalSettlement";

const receivable = { id: 7, amountCents: 10_000_00, currency: "MXN" };

describe("getFiscalCollectionStatus", () => {
  it("muestra una CxC facturada sin cobros como pendiente", () => {
    expect(getFiscalCollectionStatus(receivable, [])).toMatchObject({ status: "pending", paidCents: 0, remainingCents: 10_000_00 });
  });

  it("distingue cobro parcial conciliado de un abono aún no conciliado", () => {
    const payments = [
      { receivableId: 7, amountCents: 4_000_00, linkedTransactionId: 99 },
      { receivableId: 7, amountCents: 1_000_00, linkedTransactionId: null },
    ];
    expect(getFiscalCollectionStatus(receivable, payments)).toMatchObject({ status: "partial_pending", paidCents: 5_000_00, reconciledCents: 4_000_00, pendingReconciliationCents: 1_000_00, remainingCents: 5_000_00 });
  });

  it("identifica una CxC totalmente cobrada y conciliada sin modificar sus abonos", () => {
    const payments = [{ receivableId: 7, amountCents: 10_000_00, linkedTransactionId: 99 }];
    expect(getFiscalCollectionStatus(receivable, payments)).toMatchObject({ status: "settled_reconciled", paidCents: 10_000_00, reconciledCents: 10_000_00, remainingCents: 0 });
  });
});
