import { describe, expect, it } from "vitest";
import { filterWorkspaceSnapshot } from "../components/WorkspaceFilterBar";
import { buildFinancialReportSummary, buildTransactionsCsv } from "./reportExport";

describe("filterWorkspaceSnapshot", () => {
  it("limita movimientos y recursos por entidad, proyecto, moneda y revisión", () => {
    const snapshot = {
      transactions: [
        { id: 1, entityId: 10, projectId: 20, currency: "MXN", reviewStatus: "approved" },
        { id: 2, entityId: 10, projectId: 20, currency: "USD", reviewStatus: "approved" },
        { id: 3, entityId: 10, projectId: 21, currency: "MXN", reviewStatus: "pending_review" },
        { id: 4, entityId: 11, projectId: 20, currency: "MXN", reviewStatus: "approved" },
      ],
      accounts: [{ id: 1, entityId: 10, projectId: 20, currency: "MXN" }, { id: 2, entityId: 10, projectId: 20, currency: "USD" }],
      debts: [{ id: 1, entityId: 10, projectId: 20, currency: "MXN" }],
      investments: [{ id: 1, entityId: 10, projectId: 20, currency: "MXN", reportCurrency: null }, { id: 2, entityId: 10, projectId: 21, currency: "MXN", reportCurrency: null }, { id: 3, entityId: 10, projectId: 20, currency: "USD", reportCurrency: "MXN" }],
      receivables: [{ id: 1, entityId: 10, projectId: 20, currency: "MXN" }, { id: 2, entityId: 10, projectId: 21, currency: "MXN" }, { id: 3, entityId: 11, projectId: 20, currency: "MXN" }, { id: 4, entityId: 10, projectId: 20, currency: "USD" }],
      budgets: [{ id: 1, entityId: 10, projectId: 20 }, { id: 2, entityId: 11, projectId: 20 }],
      goals: [], documents: [{ id: 1, entityId: 10, projectId: 20 }, { id: 2, entityId: 10, projectId: 21 }, { id: 3, entityId: 11, projectId: 20 }], calendarEvents: [], statements: [],
      fiscalRecords: [{ id: 1, entityId: 10, projectId: 20, currency: "MXN" }, { id: 2, entityId: 10, projectId: 21, currency: "MXN" }, { id: 3, entityId: 11, projectId: 20, currency: "MXN" }, { id: 4, entityId: 10, projectId: 20, currency: "USD" }],
    };

    const filtered = filterWorkspaceSnapshot(snapshot, { entityId: "10", projectId: "20", currency: "MXN", reviewStatus: "approved" });

    expect(filtered.transactions.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.accounts.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.debts.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.investments.map((item: any) => item.id)).toEqual([1, 3]);
    expect(filtered.receivables.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.budgets.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.documents.map((item: any) => item.id)).toEqual([1]);
    expect(filtered.fiscalRecords.map((item: any) => item.id)).toEqual([1]);
  });

  it("conserva una tarjeta PFAE sin entidad ni proyecto bajo moneda y la excluye de filtros específicos", () => {
    const snapshot = {
      transactions: [], accounts: [], debts: [], investments: [], receivables: [], budgets: [], goals: [], documents: [], calendarEvents: [], statements: [],
      creditCards: [
        { id: 1, scope: "pfae", entityId: null, projectId: null, currency: "MXN" },
        { id: 2, scope: "personal", entityId: 10, projectId: 20, currency: "MXN" },
      ],
    };

    expect(filterWorkspaceSnapshot(snapshot, { entityId: "", projectId: "", currency: "MXN", reviewStatus: "" }).creditCards.map((item: any) => item.id)).toEqual([1, 2]);
    expect(filterWorkspaceSnapshot(snapshot, { entityId: "10", projectId: "", currency: "MXN", reviewStatus: "" }).creditCards.map((item: any) => item.id)).toEqual([2]);
    expect(filterWorkspaceSnapshot(snapshot, { entityId: "", projectId: "20", currency: "MXN", reviewStatus: "" }).creditCards.map((item: any) => item.id)).toEqual([2]);
    expect(filterWorkspaceSnapshot(snapshot, { entityId: "__personal__", projectId: "", currency: "MXN", reviewStatus: "" }).creditCards.map((item: any) => item.id)).toEqual([2]);
  });

  it("serializa en CSV únicamente los movimientos presentes en el conjunto filtrado", () => {
    const csv = buildTransactionsCsv({ categories: [], accounts: [], entities: [], projects: [], transactions: [{ id: 1, occurredAt: new Date("2026-08-01"), type: "income", scope: "business", amountCents: 1200, currency: "MXN", reportCurrency: "MXN", reportAmountCents: 1200, exchangeRateMicros: null, incomeNature: "business_revenue", categoryId: null, accountId: null, entityId: null, projectId: null, status: "confirmed", reviewStatus: "approved", notes: "Incluido" }] });
    expect(csv).toContain("Incluido");
    expect(csv).not.toContain("Excluido");
  });

  it("calcula el resumen del PDF únicamente desde las partidas filtradas y convertidas", () => {
    const summary = buildFinancialReportSummary({ profile: { currency: "MXN" }, dashboard: { periodStart: new Date("2026-08-01"), reportCurrency: "MXN" }, accounts: [], debts: [], transactions: [{ occurredAt: new Date("2026-08-04"), type: "income", amountCents: 1000, currency: "MXN", reportCurrency: "MXN", reportAmountCents: 1000 }, { occurredAt: new Date("2026-08-04"), type: "income", amountCents: 2000, currency: "EUR", reportCurrency: "MXN", reportAmountCents: null }] });
    expect(summary.cashFlow.incomeCents).toBe(1000);
    expect(summary.cashFlow.pendingConversionCount).toBe(1);
  });
});
