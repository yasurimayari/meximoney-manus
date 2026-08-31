import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { AmortizationAdjustment, AmortizationDebt, AmortizationPayment, AmortizationProjection } from "@/lib/amortizationExport";

export type FinancedAssetExportAsset = {
  id: number;
  name: string;
  type?: string | null;
  institution?: string | null;
  currency: string;
  costBasisCents?: number | null;
  currentValueCents?: number | null;
  valuationDate?: Date | string | null;
  notes?: string | null;
};

export type FinancedAssetExportInput = {
  asset: FinancedAssetExportAsset;
  debt: AmortizationDebt;
  payments: AmortizationPayment[];
  adjustments: AmortizationAdjustment[];
  projection: AmortizationProjection;
};

export type FinancedAssetDetailRow = {
  Sección: string;
  Activo: string;
  Fecha: string;
  Concepto: string;
  Importe: number | "";
  Moneda: string;
  Capital: number | "";
  Interés: number | "";
  "Interés vencido": number | "";
  Cargos: number | "";
  "Saldo final": number | "";
  Nota: string;
};

const typeLabels: Record<string, string> = { vehicle: "Vehículo", property: "Inmueble", land: "Terreno", other: "Otro" };
const adjustmentLabels: Record<string, string> = { late_interest: "Interés vencido", finance_charge: "Cargo financiero", other_charge: "Otro cargo", correction: "Corrección de saldo" };

function date(value: Date | string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function money(value: number) {
  return value / 100;
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(name: string, id: number) {
  return name.toLocaleLowerCase("es-MX").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "") || `activo-${id}`;
}

export function buildFinancedAssetDetailRows(input: FinancedAssetExportInput): FinancedAssetDetailRow[] {
  const { asset, debt, payments, adjustments, projection } = input;
  const rows: FinancedAssetDetailRow[] = [
    { Sección: "Resumen", Activo: asset.name, Fecha: date(asset.valuationDate), Concepto: "Valor manual actual", Importe: money(asset.currentValueCents ?? 0), Moneda: asset.currency, Capital: "", Interés: "", "Interés vencido": "", Cargos: "", "Saldo final": "", Nota: asset.notes ?? "" },
    { Sección: "Resumen", Activo: asset.name, Fecha: "", Concepto: "Costo acumulado", Importe: money(asset.costBasisCents ?? 0), Moneda: asset.currency, Capital: "", Interés: "", "Interés vencido": "", Cargos: "", "Saldo final": "", Nota: "" },
    { Sección: "Resumen", Activo: asset.name, Fecha: "", Concepto: "Saldo pendiente de financiación", Importe: money(debt.balanceCents), Moneda: debt.currency, Capital: "", Interés: "", "Interés vencido": "", Cargos: "", "Saldo final": "", Nota: "" },
  ];
  payments.forEach(payment => rows.push({ Sección: "Pago conciliado", Activo: asset.name, Fecha: date(payment.paidAt), Concepto: "Pago registrado", Importe: money(payment.totalPaymentCents), Moneda: debt.currency, Capital: money(payment.principalCents), Interés: money(payment.interestCents), "Interés vencido": money(payment.lateInterestCents), Cargos: money(payment.feeCents), "Saldo final": "", Nota: "" }));
  adjustments.forEach(adjustment => rows.push({ Sección: "Cargo manual", Activo: asset.name, Fecha: date(adjustment.occurredAt), Concepto: adjustmentLabels[adjustment.type] ?? adjustment.type, Importe: money(adjustment.amountCents), Moneda: debt.currency, Capital: "", Interés: adjustment.type === "late_interest" ? money(adjustment.amountCents) : "", "Interés vencido": adjustment.type === "late_interest" ? money(adjustment.amountCents) : "", Cargos: adjustment.type === "late_interest" ? "" : money(adjustment.amountCents), "Saldo final": "", Nota: adjustment.notes ?? "" }));
  projection.rows.forEach(row => rows.push({ Sección: "Proyección", Activo: asset.name, Fecha: "", Concepto: `Cuota ${row.installment}`, Importe: money(row.plannedPaymentCents), Moneda: debt.currency, Capital: money(row.principalCents), Interés: money(row.regularInterestCents), "Interés vencido": "", Cargos: "", "Saldo final": money(row.closingBalanceCents), Nota: "Proyección de referencia" }));
  return rows;
}

const headers: (keyof FinancedAssetDetailRow)[] = ["Sección", "Activo", "Fecha", "Concepto", "Importe", "Moneda", "Capital", "Interés", "Interés vencido", "Cargos", "Saldo final", "Nota"];

export function buildFinancedAssetCsvRows(rows: FinancedAssetDetailRow[]) {
  return `\uFEFF${[headers, ...rows.map(row => headers.map(header => row[header]))].map(row => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function buildFinancedAssetWorkbook(input: FinancedAssetExportInput) {
  const book = XLSX.utils.book_new();
  const detail = XLSX.utils.json_to_sheet(buildFinancedAssetDetailRows(input));
  detail["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 13 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(book, detail, "Detalle del activo");
  return book;
}

export function exportFinancedAssetDetail(kind: "csv" | "xlsx" | "pdf", input: FinancedAssetExportInput) {
  const filename = `meximoney-activo-financiado-${safeName(input.asset.name, input.asset.id)}-${new Date().toISOString().slice(0, 10)}`;
  const rows = buildFinancedAssetDetailRows(input);
  if (kind === "csv") {
    download(new Blob([buildFinancedAssetCsvRows(rows)], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
    return;
  }
  if (kind === "xlsx") {
    XLSX.writeFile(buildFinancedAssetWorkbook(input), `${filename}.xlsx`);
    return;
  }
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  let y = 46;
  const header = (continued = false) => {
    document.setFillColor(0, 91, 81); document.rect(0, 0, width, continued ? 48 : 108, "F");
    document.setTextColor(255, 255, 255); document.setFont("helvetica", "bold"); document.setFontSize(17); document.text(continued ? "Activo financiado · continuación" : "Meximoney · Detalle del activo financiado", 42, 37);
    if (!continued) { document.setFont("helvetica", "normal"); document.setFontSize(9); document.text(input.asset.name, 42, 59); document.text(`${typeLabels[input.asset.type ?? ""] ?? "Activo"}${input.asset.institution ? ` · ${input.asset.institution}` : ""} · ${input.asset.currency}`, 42, 77); document.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Datos manuales`, 42, 93); }
    y = continued ? 76 : 138;
  };
  const ensureSpace = (space: number) => { if (y + space > height - 44) { document.addPage(); header(true); } };
  const writeSection = (title: string) => { ensureSpace(30); document.setTextColor(28, 56, 54); document.setFont("helvetica", "bold"); document.setFontSize(12); document.text(title, 42, y); y += 20; };
  const writeLine = (label: string, value: string) => { ensureSpace(18); document.setFont("helvetica", "normal"); document.setFontSize(8.5); document.setTextColor(90, 107, 104); document.text(label, 50, y); document.setTextColor(28, 56, 54); document.text(value, width - 50, y, { align: "right" }); y += 15; };
  header();
  writeSection("Resumen del activo");
  writeLine("Valor manual actual", `${money(input.asset.currentValueCents ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${input.asset.currency}`);
  writeLine("Costo acumulado", `${money(input.asset.costBasisCents ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${input.asset.currency}`);
  writeLine("Saldo pendiente", `${money(input.debt.balanceCents).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${input.debt.currency}`);
  writeSection("Pagos conciliados");
  if (!input.payments.length) writeLine("Estado", "Sin pagos conciliados");
  input.payments.forEach(payment => writeLine(date(payment.paidAt), `${money(payment.totalPaymentCents).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${input.debt.currency} · capital ${money(payment.principalCents).toFixed(2)} · interés ${money(payment.interestCents + payment.lateInterestCents).toFixed(2)} · cargos ${money(payment.feeCents).toFixed(2)}`));
  writeSection("Intereses y cargos por atraso");
  if (!input.adjustments.length) writeLine("Estado", "Sin cargos manuales acumulados");
  input.adjustments.forEach(adjustment => writeLine(`${date(adjustment.occurredAt)} · ${adjustmentLabels[adjustment.type] ?? adjustment.type}`, `${money(adjustment.amountCents).toLocaleString("es-MX", { minimumFractionDigits: 2 })} ${input.debt.currency}${adjustment.notes ? ` · ${adjustment.notes}` : ""}`));
  writeSection("Tabla de amortización proyectada");
  if (!input.projection.rows.length) writeLine("Estado", "Sin proyección disponible");
  input.projection.rows.forEach(row => writeLine(`Cuota ${row.installment}`, `Inicial ${money(row.openingBalanceCents).toFixed(2)} · interés ${money(row.regularInterestCents).toFixed(2)} · pago ${money(row.plannedPaymentCents).toFixed(2)} · capital ${money(row.principalCents).toFixed(2)} · final ${money(row.closingBalanceCents).toFixed(2)} ${input.debt.currency}`));
  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) { document.setPage(page); document.setTextColor(90, 107, 104); document.setFont("helvetica", "normal"); document.setFontSize(7.2); document.text(`Meximoney · Página ${page} de ${pageCount} · Información manual para revisión`, width - 42, height - 24, { align: "right" }); }
  document.save(`${filename}.pdf`);
}
