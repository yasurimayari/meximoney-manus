import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

export type InvestmentExportPosition = {
  id: number;
  name: string;
  type: string;
  institution?: string | null;
  currency: string;
  currentValueCents: number;
  valuationDate?: Date | string | null;
  notes?: string | null;
};

export type InvestmentExportOperation = {
  investmentId: number;
  type: string;
  amountCents: number;
  occurredAt: Date | string;
  notes?: string | null;
};

export type InvestmentExportRow = {
  Fecha: string;
  Posición: string;
  "Tipo de posición": string;
  Institución: string;
  Operación: string;
  Importe: number;
  Moneda: string;
  Notas: string;
};

const positionTypeLabels: Record<string, string> = {
  savings: "Ahorro",
  fixed_income: "Renta fija",
  fund_etf: "Fondo o ETF",
  stock: "Acciones",
  crypto: "Criptoactivos",
  land: "Terreno",
  property: "Inmueble",
  business_equity: "Participación empresarial",
  retirement: "Retiro",
  other: "Otro",
};

const operationTypeLabels: Record<string, string> = {
  contribution: "Aportación",
  withdrawal: "Retiro",
  yield: "Rendimiento registrado",
  valuation_adjustment: "Ajuste de valuación",
  valuation: "Valuación actual",
};

function toExportDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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

export function buildInvestmentExportRows(positions: InvestmentExportPosition[], operations: InvestmentExportOperation[]): InvestmentExportRow[] {
  return positions.flatMap(position => {
    const positionOperations = operations
      .filter(operation => operation.investmentId === position.id)
      .slice()
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
    const base = {
      Posición: position.name,
      "Tipo de posición": positionTypeLabels[position.type] ?? position.type,
      Institución: position.institution ?? "",
      Moneda: position.currency,
    };
    if (positionOperations.length === 0) {
      return [{
        ...base,
        Fecha: toExportDate(position.valuationDate),
        Operación: operationTypeLabels.valuation,
        Importe: position.currentValueCents / 100,
        Notas: position.notes ?? "",
      }];
    }
    return positionOperations.map(operation => ({
      ...base,
      Fecha: toExportDate(operation.occurredAt),
      Operación: operationTypeLabels[operation.type] ?? operation.type,
      Importe: operation.amountCents / 100,
      Notas: operation.notes ?? "",
    }));
  });
}

export function buildInvestmentCsv(rows: InvestmentExportRow[]) {
  const headers: (keyof InvestmentExportRow)[] = ["Fecha", "Posición", "Tipo de posición", "Institución", "Operación", "Importe", "Moneda", "Notas"];
  return `\uFEFF${[headers, ...rows.map(row => headers.map(header => row[header]))].map(row => row.map(escapeCsv).join(",")).join("\n")}`;
}

export function buildInvestmentWorkbook(rows: InvestmentExportRow[]) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ["Fecha", "Posición", "Tipo de posición", "Institución", "Operación", "Importe", "Moneda", "Notas"] });
  sheet["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 21 }, { wch: 24 }, { wch: 25 }, { wch: 14 }, { wch: 10 }, { wch: 48 }];
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 7, r: Math.max(1, rows.length) } }) };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Inversiones");
  return book;
}

export function buildInvestmentPdfLines(row: InvestmentExportRow) {
  const context = [row["Tipo de posición"], row.Institución].filter(Boolean).join(" · ");
  return [
    `${row.Fecha || "Sin fecha"} · ${row.Posición}`,
    context,
    `${row.Operación} · ${new Intl.NumberFormat("es-MX", { style: "currency", currency: row.Moneda, minimumFractionDigits: 2 }).format(row.Importe)}`,
    row.Notas ? `Notas: ${row.Notas}` : "",
  ].filter(Boolean);
}

export function buildInvestmentPdfSummary(rows: InvestmentExportRow[]) {
  return { positionCount: new Set(rows.map(row => row.Posición)).size, recordCount: rows.length, currencies: Array.from(new Set(rows.map(row => row.Moneda))).sort() };
}

export function exportInvestmentHistory(kind: "csv" | "xlsx" | "pdf", rows: InvestmentExportRow[]) {
  const date = new Date().toISOString().slice(0, 10);
  if (kind === "csv") {
    download(new Blob([buildInvestmentCsv(rows)], { type: "text/csv;charset=utf-8" }), `meximoney-historial-inversiones-${date}.csv`);
    return;
  }
  if (kind === "xlsx") {
    XLSX.writeFile(buildInvestmentWorkbook(rows), `meximoney-historial-inversiones-${date}.xlsx`);
    return;
  }
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  const summary = buildInvestmentPdfSummary(rows);
  let y = 54;
  const addHeader = (continuation = false) => {
    document.setFillColor(0, 91, 81); document.rect(0, 0, width, continuation ? 50 : 92, "F");
    document.setTextColor(255, 255, 255); document.setFont("helvetica", "bold"); document.setFontSize(17);
    document.text(continuation ? "Historial de inversiones · continuación" : "Richeon · Historial de inversiones", 42, continuation ? 31 : 38);
    if (!continuation) { document.setFont("helvetica", "normal"); document.setFontSize(8.5); document.text(`${summary.positionCount} posiciones · ${summary.recordCount} registros · ${summary.currencies.join(" / ") || "Sin moneda"}`, 42, 60); document.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Datos registrados manualmente`, 42, 76); }
    y = continuation ? 76 : 118; document.setFillColor(238, 245, 243); document.rect(42, y - 16, width - 84, 19, "F"); document.setFont("helvetica", "bold"); document.setFontSize(7.5); document.setTextColor(44, 75, 71);
    document.text("FECHA", 50, y - 4); document.text("POSICIÓN / CONTEXTO", 106, y - 4); document.text("MOVIMIENTO", 350, y - 4); document.text("IMPORTE", width - 50, y - 4, { align: "right" }); y += 14;
  };
  addHeader();
  if (rows.length === 0) {
    document.setFont("helvetica", "normal");
    document.setFontSize(10);
    document.setTextColor(90, 107, 104);
    document.text("No hay posiciones ni operaciones manuales para exportar.", 42, y);
  }
  rows.forEach(row => {
    const positionLines = document.splitTextToSize(row.Posición, 210) as string[];
    const context = [row["Tipo de posición"], row.Institución].filter(Boolean).join(" · "); const contextLines = context ? document.splitTextToSize(context, 210) as string[] : [];
    const noteLines = row.Notas ? document.splitTextToSize(`Notas: ${row.Notas}`, width - 148) as string[] : [];
    const rowHeight = Math.max(31, (positionLines.length + contextLines.length) * 9 + 15) + (noteLines.length ? noteLines.length * 8.5 + 10 : 0);
    if (y + rowHeight > height - 42) { document.addPage(); addHeader(true); }
    document.setDrawColor(224, 233, 229); document.line(42, y + rowHeight - 5, width - 42, y + rowHeight - 5); document.setTextColor(28, 56, 54); document.setFont("helvetica", "bold"); document.setFontSize(8.5);
    document.text(row.Fecha || "Sin fecha", 50, y); document.text(positionLines, 106, y); document.text(row.Operación, 350, y); document.text(new Intl.NumberFormat("es-MX", { style: "currency", currency: row.Moneda, minimumFractionDigits: 2 }).format(row.Importe), width - 50, y, { align: "right" });
    document.setFont("helvetica", "normal"); document.setTextColor(90, 107, 104); document.setFontSize(7.5); if (contextLines.length) document.text(contextLines, 106, y + positionLines.length * 9 + 2); if (noteLines.length) document.text(noteLines, 106, y + Math.max(positionLines.length * 9 + contextLines.length * 9, 12) + 8); y += rowHeight;
  });
  const pageCount = document.getNumberOfPages(); for (let page = 1; page <= pageCount; page += 1) { document.setPage(page); document.setFont("helvetica", "normal"); document.setFontSize(7.5); document.setTextColor(90, 107, 104); document.text(`Richeon · Página ${page} de ${pageCount}`, width - 42, height - 24, { align: "right" }); }
  document.save(`meximoney-historial-inversiones-${date}.pdf`);
}
