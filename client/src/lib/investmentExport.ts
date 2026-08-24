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
  let y = 54;
  const addHeader = (continuation = false) => {
    document.setFillColor(0, 91, 81);
    document.rect(0, 0, width, continuation ? 46 : 86, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(18);
    document.text(continuation ? "Historial de inversiones · continuación" : "Meximoney · Historial de inversiones", 42, continuation ? 29 : 36);
    if (!continuation) {
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      document.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Datos manuales`, 42, 58);
    }
    document.setTextColor(28, 56, 54);
    y = continuation ? 74 : 116;
  };
  addHeader();
  if (rows.length === 0) {
    document.setFont("helvetica", "normal");
    document.setFontSize(10);
    document.setTextColor(90, 107, 104);
    document.text("No hay posiciones ni operaciones manuales para exportar.", 42, y);
  }
  rows.forEach((row, index) => {
    const lines = buildInvestmentPdfLines(row).flatMap((line, lineIndex) => lineIndex === 3 ? document.splitTextToSize(line, width - 104) : [line]);
    const blockHeight = 18 + lines.length * 13;
    if (y + blockHeight > height - 42) {
      document.addPage();
      addHeader(true);
    }
    document.setDrawColor(224, 233, 229);
    document.setFillColor(index % 2 === 0 ? 246 : 251, index % 2 === 0 ? 249 : 252, index % 2 === 0 ? 247 : 250);
    document.roundedRect(42, y - 15, width - 84, blockHeight, 5, 5, "FD");
    document.setTextColor(28, 56, 54);
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.text(lines[0] ?? "", 54, y);
    document.setFont("helvetica", "normal");
    document.setTextColor(90, 107, 104);
    document.setFontSize(8.5);
    lines.slice(1).forEach((line, lineIndex) => document.text(line, 54, y + 13 + lineIndex * 13));
    y += blockHeight + 9;
  });
  document.save(`meximoney-historial-inversiones-${date}.pdf`);
}
