import * as XLSX from "xlsx";

export type PatrimonyHistoryExportRow = {
  periodo: string;
  activos: number;
  pasivos: number;
  patrimonioNeto: number;
  origen: string;
};

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildPatrimonyHistoryCsv(rows: PatrimonyHistoryExportRow[]) {
  const headers = ["Periodo", "Activos", "Pasivos", "Patrimonio neto", "Origen"];
  return `\uFEFF${headers.map(escapeCsv).join(",")}\n${rows.map(row => [row.periodo, row.activos.toFixed(2), row.pasivos.toFixed(2), row.patrimonioNeto.toFixed(2), row.origen].map(escapeCsv).join(",")).join("\n")}\n`;
}

export function buildPatrimonyHistoryWorkbook(rows: PatrimonyHistoryExportRow[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.map(row => ({
    Periodo: row.periodo,
    Activos: row.activos,
    Pasivos: row.pasivos,
    "Patrimonio neto": row.patrimonioNeto,
    Origen: row.origen,
  })));
  sheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Evolución");
  return workbook;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPatrimonyHistory(kind: "csv" | "xlsx", rows: PatrimonyHistoryExportRow[]) {
  const date = new Date().toISOString().slice(0, 10);
  if (kind === "csv") {
    download(new Blob([buildPatrimonyHistoryCsv(rows)], { type: "text/csv;charset=utf-8" }), `meximoney-evolucion-patrimonio-${date}.csv`);
    return;
  }
  XLSX.writeFile(buildPatrimonyHistoryWorkbook(rows), `meximoney-evolucion-patrimonio-${date}.xlsx`);
}
