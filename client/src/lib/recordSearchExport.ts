import { jsPDF } from "jspdf";
import type { RecordSearchResult } from "./recordSearch";

export type RecordSearchExportRow = {
  Fecha: string;
  Tipo: string;
  Resultado: string;
  Detalle: string;
  Importe: number | "";
  Moneda: string;
  Referencia: string;
  Destino: string;
};

const kindLabel: Record<string, string> = { transaction: "Movimiento", investment: "Inversión", statement: "Estado financiero", document: "Documento" };

function exportDate(value: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildRecordSearchExportRows(results: RecordSearchResult[]): RecordSearchExportRow[] {
  return results.map(result => ({
    Fecha: exportDate(result.date),
    Tipo: kindLabel[result.kind] ?? result.kind,
    Resultado: result.title,
    Detalle: result.detail,
    Importe: result.amountCents == null ? "" : result.amountCents / 100,
    Moneda: result.currency ?? "",
    Referencia: result.bankReference ?? "",
    Destino: result.href,
  }));
}

export function buildRecordSearchCsv(rows: RecordSearchExportRow[]) {
  const headers: (keyof RecordSearchExportRow)[] = ["Fecha", "Tipo", "Resultado", "Detalle", "Importe", "Moneda", "Referencia", "Destino"];
  return `\uFEFF${[headers, ...rows.map(row => headers.map(header => row[header]))].map(row => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function exportRecordSearchResults(kind: "csv" | "pdf", results: RecordSearchResult[], description: string) {
  const rows = buildRecordSearchExportRows(results);
  const date = new Date().toISOString().slice(0, 10);
  if (kind === "csv") {
    download(new Blob([buildRecordSearchCsv(rows)], { type: "text/csv;charset=utf-8" }), `meximoney-busqueda-${date}.csv`);
    return;
  }
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  let y = 112;
  const addHeader = (continuation = false) => {
    pdf.setFillColor(0, 91, 81); pdf.rect(0, 0, width, continuation ? 52 : 94, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(continuation ? "Resultados de búsqueda · continuación" : "Meximoney · Resultados de búsqueda", 42, continuation ? 32 : 39);
    if (!continuation) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text(`${rows.length} resultado${rows.length === 1 ? "" : "s"} · ${description}`, 42, 59); pdf.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Consulta de solo lectura`, 42, 76); }
    y = continuation ? 78 : 116;
  };
  addHeader();
  if (!rows.length) { pdf.setTextColor(80, 96, 94); pdf.setFontSize(10); pdf.text("No hay resultados para exportar.", 42, y); }
  rows.forEach(row => {
    const titleLines = pdf.splitTextToSize(row.Resultado, width - 142) as string[];
    const detailLines = pdf.splitTextToSize([row.Detalle, row.Referencia ? `Referencia bancaria: ${row.Referencia}` : ""].filter(Boolean).join(" · "), width - 142) as string[];
    const amount = row.Importe === "" || !row.Moneda ? "" : new Intl.NumberFormat("es-MX", { style: "currency", currency: row.Moneda, minimumFractionDigits: 2 }).format(row.Importe);
    const rowHeight = Math.max(42, titleLines.length * 10 + detailLines.length * 9 + 17);
    if (y + rowHeight > height - 42) { pdf.addPage(); addHeader(true); }
    pdf.setDrawColor(224, 233, 229); pdf.line(42, y + rowHeight - 7, width - 42, y + rowHeight - 7);
    pdf.setTextColor(24, 56, 54); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.text(row.Fecha || "Sin fecha", 42, y); pdf.text(titleLines, 112, y);
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(89, 106, 104); pdf.setFontSize(7.5); pdf.text(row.Tipo, 42, y + 12); pdf.text(detailLines, 112, y + titleLines.length * 10 + 2);
    if (amount) { pdf.setFont("helvetica", "bold"); pdf.setTextColor(24, 56, 54); pdf.setFontSize(8.5); pdf.text(amount, width - 42, y, { align: "right" }); }
    y += rowHeight;
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(89, 106, 104); pdf.text(`Meximoney · Página ${page} de ${pages}`, width - 42, height - 24, { align: "right" }); }
  pdf.save(`meximoney-busqueda-${date}.pdf`);
}
