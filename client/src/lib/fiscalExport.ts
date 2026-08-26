import { getFiscalCollectionStatus } from "./receivableFiscalSettlement";

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function amount(cents: number) {
  return (cents / 100).toFixed(2);
}

const typeLabels: Record<string, string> = {
  income_invoice: "Ingreso facturado",
  expense_receipt: "Gasto con comprobante",
  payment_complement: "Complemento de pago",
  other: "Otro soporte",
};

const reviewLabels: Record<string, string> = { draft: "Borrador", pending_review: "Pendiente de revisión", reviewed: "Revisado", excluded: "Excluido" };
const deductibilityLabels: Record<string, string> = { pending: "Pendiente", deductible: "Deducible", non_deductible: "No deducible", review: "Por revisar" };

export function buildFiscalInformativeCsv({ snapshot, records, period, summary }: { snapshot: any; records: any[]; period: string; summary: any }) {
  const entities = new Map((snapshot.entities ?? []).map((item: any) => [item.id, item.shortCode || item.name]));
  const projects = new Map((snapshot.projects ?? []).map((item: any) => [item.id, item.name]));
  const contacts = new Map((snapshot.contacts ?? []).map((item: any) => [item.id, item.name]));
  const documents = new Map((snapshot.documents ?? []).map((item: any) => [item.id, item.name]));
  const receivables = new Map((snapshot.receivables ?? []).map((item: any) => [item.id, item]));
  const rows: unknown[][] = [
    ["Meximoney — Exportación PFAE informativa"],
    ["Periodo", period],
    ["Aviso", "Datos manuales informativos. No calcula impuestos, no genera CFDI y no constituye una declaración ante el SAT."],
    [],
    ["Resumen", "Valor registrado", "Moneda de control"],
    ["Facturado registrado", amount(summary.invoiced), snapshot.profile?.currency || "MXN"],
    ["Cobros conciliados", amount(summary.reconciledCollections), snapshot.profile?.currency || "MXN"],
    ["Cobros por conciliar", amount(summary.pendingCollectionLinks), snapshot.profile?.currency || "MXN"],
    ["Base registrada", amount(summary.registeredBase), snapshot.profile?.currency || "MXN"],
    ["IVA registrado", amount(summary.registeredVat), snapshot.profile?.currency || "MXN"],
    ["Renglones pendientes de revisión", summary.pendingReview, ""],
    ["Renglones sin evidencia vinculada", summary.missingEvidence, ""],
    [],
    ["Periodo", "Descripción", "Tipo", "Estado de revisión", "Deducibilidad manual", "Entidad", "Proyecto", "Contacto", "CxC", "Estado CxC", "Evidencia", "Referencia", "Total", "Base", "IVA", "Moneda", "Fecha de emisión", "Fecha de cobro", "Notas de revisión", "Nota de decisión manual"],
  ];
  records.slice().sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach((record: any) => {
    const receivable: any = receivables.get(record.receivableId);
    const settlement = receivable ? getFiscalCollectionStatus(receivable, snapshot.receivablePayments ?? []) : null;
    rows.push([
      period, record.description, typeLabels[record.recordType] || record.recordType, reviewLabels[record.reviewStatus] || record.reviewStatus,
      deductibilityLabels[record.deductibility] || record.deductibility, entities.get(record.entityId) || "", projects.get(record.projectId) || "",
      contacts.get(record.contactId) || "", receivable?.counterparty || "", settlement?.status || "", documents.get(record.documentId) || "",
      record.fiscalReference || "", amount(record.totalCents), amount(record.taxableBaseCents), amount(record.vatCents), record.currency,
      record.invoiceIssuedAt ? new Date(record.invoiceIssuedAt).toISOString().slice(0, 10) : "", record.collectedAt ? new Date(record.collectedAt).toISOString().slice(0, 10) : "", record.notes || "", record.decisionNote || "",
    ]);
  });
  return `\uFEFF${rows.map(row => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function exportFiscalInformativeCsv(input: Parameters<typeof buildFiscalInformativeCsv>[0]) {
  const csv = buildFiscalInformativeCsv(input);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `meximoney-pfae-informativo-${input.period}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
