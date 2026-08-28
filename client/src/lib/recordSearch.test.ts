import { describe, expect, it } from "vitest";
import { findRecordSearchResults } from "./recordSearch";

const snapshot = {
  dashboard: { reportCurrency: "MXN" },
  accounts: [{ id: 8, name: "Santander" }],
  categories: [{ id: 9, name: "Suscripciones" }],
  contacts: [{ id: 10, name: "Notion" }],
  transactions: [{ id: 1, type: "expense", notes: "Suscripción Notion", accountId: 8, categoryId: 9, contactId: 10, occurredAt: new Date("2026-08-14T12:00:00Z"), amountCents: 34900, currency: "MXN" }],
  investments: [{ id: 2, name: "Bitcoin de largo plazo", institution: "Bitso", type: "crypto", status: "active", valuationDate: new Date("2026-08-18T12:00:00Z"), currentValueCents: 120000, currency: "MXN" }],
  statements: [{ id: 3, periodStart: new Date("2026-08-01T12:00:00Z"), scope: "personal", status: "closed", notes: "Conciliado", netWorthCents: 500000 }],
  documents: [{ id: 4, name: "Estado de cuenta Santander", type: "statement", issuedAt: new Date("2026-08-31T12:00:00Z"), notes: "Agosto" }],
};

describe("búsqueda unificada de Registro", () => {
  it("encuentra resultados entre movimientos, inversiones, estados y documentos", () => {
    expect(findRecordSearchResults(snapshot, { query: "notion" }).map(item => item.key)).toEqual(["transaction-1"]);
    expect(findRecordSearchResults(snapshot, { query: "bitcoin" }).map(item => item.key)).toEqual(["investment-2"]);
    expect(findRecordSearchResults(snapshot, { query: "conciliado" }).map(item => item.key)).toEqual(["statement-3"]);
    expect(findRecordSearchResults(snapshot, { query: "santander" }).map(item => item.key)).toEqual(["document-4", "transaction-1"]);
    expect(findRecordSearchResults(snapshot, { query: "suscripciones" }).map(item => item.key)).toEqual(["transaction-1"]);
  });

  it("respeta el tipo y el mes elegidos sin alterar los datos de origen", () => {
    expect(findRecordSearchResults(snapshot, { kind: "investment", month: "2026-08" }).map(item => item.key)).toEqual(["investment-2"]);
    expect(findRecordSearchResults(snapshot, { kind: "statement", month: "2026-07" })).toEqual([]);
    expect(snapshot.transactions[0]?.notes).toBe("Suscripción Notion");
  });
});
