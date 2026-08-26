import { describe, expect, it } from "vitest";
import { buildFiscalInformativeCsv } from "./fiscalExport";

describe("buildFiscalInformativeCsv", () => {
  it("incluye datos manuales del periodo y omite URL de evidencia y correos de contacto", () => {
    const csv = buildFiscalInformativeCsv({
      period: "2026-08",
      summary: { invoiced: 116000, reconciledCollections: 100000, pendingCollectionLinks: 16000, registeredBase: 100000, registeredVat: 16000, pendingReview: 1, missingEvidence: 0 },
      snapshot: {
        profile: { currency: "MXN" }, entities: [{ id: 1, shortCode: "YMC" }], projects: [{ id: 2, name: "Consultoría" }],
        contacts: [{ id: 3, name: "Cliente privado", email: "cliente@example.com" }], documents: [{ id: 4, name: "Factura agosto", url: "https://privado.example/factura" }],
        receivables: [{ id: 5, counterparty: "Cliente privado", amountCents: 116000, currency: "MXN" }], receivablePayments: [{ receivableId: 5, amountCents: 100000, linkedTransactionId: 6 }],
      },
      records: [{ id: 1, createdAt: new Date("2026-08-01T12:00:00Z"), description: "Servicios agosto", recordType: "income_invoice", reviewStatus: "pending_review", deductibility: "pending", entityId: 1, projectId: 2, contactId: 3, receivableId: 5, documentId: 4, fiscalReference: "FOLIO-MANUAL", totalCents: 116000, taxableBaseCents: 100000, vatCents: 16000, currency: "MXN", invoiceIssuedAt: new Date("2026-08-01T12:00:00Z"), collectedAt: null, notes: "Revisar complemento" }],
    });

    expect(csv).toContain("Exportación PFAE informativa");
    expect(csv).toContain("Servicios agosto");
    expect(csv).toContain("Factura agosto");
    expect(csv).toContain("FOLIO-MANUAL");
    expect(csv).not.toContain("cliente@example.com");
    expect(csv).not.toContain("https://privado.example/factura");
  });
});
