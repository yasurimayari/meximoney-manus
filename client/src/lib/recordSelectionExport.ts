import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

export type SelectedRecordExportRow = {
  Fecha: string;
  Tipo: string;
  Detalle: string;
  Cuenta: string;
  Categoría: string;
  Moneda: string;
  Importe: number;
  "Referencia bancaria": string;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportSelectedRecords(kind: "excel" | "pdf", rows: SelectedRecordExportRow[]) {
  const date = new Date().toISOString().slice(0, 10);
  if (kind === "excel") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 13 }, { wch: 14 }, { wch: 34 }, { wch: 24 },
      { wch: 22 }, { wch: 10 }, { wch: 15 }, { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Movimientos");
    XLSX.writeFile(workbook, `meximoney-seleccion-${date}.xlsx`);
    return;
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  let y = 94;
  const addHeader = (continuation = false) => {
    pdf.setFillColor(0, 91, 81);
    pdf.rect(0, 0, width, continuation ? 52 : 78, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(continuation ? "Movimientos seleccionados · continuación" : "Meximoney · Movimientos seleccionados", 38, continuation ? 32 : 36);
    if (!continuation) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(`${rows.length} movimiento${rows.length === 1 ? "" : "s"} · Exportación manual de solo lectura`, 38, 57);
    }
    y = continuation ? 76 : 100;
  };
  addHeader();
  if (!rows.length) {
    pdf.setTextColor(80, 96, 94);
    pdf.setFontSize(10);
    pdf.text("No hay movimientos seleccionados para exportar.", 38, y);
  }
  rows.forEach((row, index) => {
    const title = pdf.splitTextToSize(row.Detalle || "Sin detalle", width - 210) as string[];
    const metadata = pdf.splitTextToSize(`${row.Fecha} · ${row.Tipo} · ${row.Cuenta} · ${row.Categoría} · Ref. ${row["Referencia bancaria"] || "—"}`, width - 210) as string[];
    const amount = new Intl.NumberFormat("es-MX", { style: "currency", currency: row.Moneda || "MXN" }).format(row.Importe);
    const rowHeight = Math.max(38, title.length * 11 + metadata.length * 9 + 14);
    if (y + rowHeight > height - 40) {
      pdf.addPage();
      addHeader(true);
    }
    pdf.setDrawColor(224, 233, 229);
    pdf.line(38, y + rowHeight - 7, width - 38, y + rowHeight - 7);
    pdf.setTextColor(24, 56, 54);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(`${index + 1}.`, 38, y);
    pdf.text(title, 58, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(89, 106, 104);
    pdf.setFontSize(7.5);
    pdf.text(metadata, 58, y + title.length * 11 + 2);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(24, 56, 54);
    pdf.setFontSize(9);
    pdf.text(amount, width - 38, y, { align: "right" });
    y += rowHeight;
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(89, 106, 104);
    pdf.text(`Meximoney · Página ${page} de ${pages}`, width - 38, height - 22, { align: "right" });
  }
  pdf.save(`meximoney-seleccion-${date}.pdf`);
}
