import { describe, expect, it } from "vitest";
import { matchStatementLines, normalizeBankReference, statementSummary } from "./bankReconciliation";

const line = { rowNumber: 2, occurredAt: new Date("2026-09-01T12:00:00.000Z"), type: "expense" as const, amountCents: 150_000, currency: "MXN", bankReference: "ABC-123", description: "Pago" };

const transaction = { id: 11, occurredAt: new Date("2026-09-01T12:00:00.000Z"), type: "expense" as const, amountCents: 150_000, currency: "MXN", bankReference: "abc123", accountId: 4 };

describe("conciliación de estados bancarios", () => {
  it("normaliza referencias ignorando mayúsculas y separadores", () => {
    expect(normalizeBankReference(" ABC-123 ")).toBe("abc123");
  });

  it("empareja por referencia e importe exacto", () => {
    expect(matchStatementLines([line], [transaction], 4)[0]).toMatchObject({ status: "auto_matched", reason: "reference_and_amount", transactionId: 11 });
  });

  it("usa importe y fecha cuando no existe referencia", () => {
    expect(matchStatementLines([{ ...line, bankReference: null }], [{ ...transaction, bankReference: null }], 4)[0]).toMatchObject({ status: "auto_matched", reason: "amount_and_date", transactionId: 11 });
  });

  it("no empareja movimientos de otra cuenta ni importes distintos", () => {
    expect(matchStatementLines([line], [{ ...transaction, accountId: 9 }, { ...transaction, id: 12, amountCents: 150_001 }], 4)[0]).toMatchObject({ status: "unmatched", transactionId: null });
  });

  it("marca como ambiguos los candidatos exactos repetidos", () => {
    expect(matchStatementLines([{ ...line, bankReference: null }], [{ ...transaction }, { ...transaction, id: 12 }], 4)[0]).toMatchObject({ status: "ambiguous", reason: "multiple_exact_matches", transactionId: null });
  });

  it("resume diferencias no resueltas", () => {
    expect(statementSummary([
      { matchStatus: "auto_matched", amountCents: 100 },
      { matchStatus: "unmatched", amountCents: 200 },
      { matchStatus: "reconciled", amountCents: 300 },
    ])).toEqual({ total: 3, auto_matched: 1, reconciled: 1, unmatched: 1, ignored: 0, differenceCents: 200 });
  });
});
