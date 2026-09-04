import * as XLSX from "xlsx";
import { formatMoney } from "./finance";

type StatementType = "balance" | "cashflow" | "income" | "networth";
const titles: Record<StatementType, string> = { balance: "Balance General", cashflow: "Flujo de caja", income: "Estado de Resultado", networth: "Patrimonio neto" };

function rowsFor(type: StatementType, statement: any, currency: string) {
  const money = (cents: number) => formatMoney(cents, currency);
  if (type === "balance") return [["Concepto", "Importe"], ["Activos", money(statement.assetCents)], ["Pasivos", money(statement.liabilityCents)], ["Patrimonio neto", money(statement.netWorthCents)], ["Liquidez disponible", money(statement.liquidCents)]];
  if (type === "cashflow") return [["Concepto", "Importe"], ["Ingresos", money(statement.incomeCents)], ["Gastos", money(statement.expenseCents)], ["Flujo neto", money(statement.netCashFlowCents)]];
  if (type === "income") return [["Concepto", "Importe"], ["Ingresos registrados", money(statement.incomeCents)], ["Gastos registrados", money(statement.expenseCents)], ["Resultado del periodo", money(statement.netCashFlowCents)]];
  return [["Concepto", "Importe"], ["Activos", money(statement.assetCents)], ["Pasivos", money(statement.liabilityCents)], ["Patrimonio neto", money(statement.netWorthCents)]];
}

export function buildStatementWorkbook(type: StatementType, statement: any, metadata: { period: string; scope: string; currency: string }) {
  const sheet = XLSX.utils.aoa_to_sheet([["Meximoney", titles[type]], ["Periodo", metadata.period], ["Ámbito", metadata.scope], ["Moneda", metadata.currency], [], ...rowsFor(type, statement, metadata.currency)]);
  sheet["!cols"] = [{ wch: 28 }, { wch: 22 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, titles[type].slice(0, 31));
  return book;
}

export function exportStatementExcel(type: StatementType, statement: any, metadata: { period: string; scope: string; currency: string }) {
  XLSX.writeFile(buildStatementWorkbook(type, statement, metadata), `meximoney-${type}-${metadata.period}.xlsx`);
}

export async function exportStatementPdf(type: StatementType, statement: any, metadata: { period: string; scope: string; currency: string }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(0, 91, 81); doc.rect(0, 0, width, 110, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text(titles[type], 44, 50);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`Meximoney · Periodo ${metadata.period} · ${metadata.scope} · ${metadata.currency}`, 44, 76);
  let y = 150; doc.setTextColor(28, 56, 54); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("Resumen automático", 44, y); y += 30;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  rowsFor(type, statement, metadata.currency).slice(1).forEach(([label, value]) => { doc.setDrawColor(224, 233, 229); doc.line(44, y + 8, width - 44, y + 8); doc.text(label, 44, y); doc.setFont("helvetica", "bold"); doc.text(value, width - 44, y, { align: "right" }); doc.setFont("helvetica", "normal"); y += 28; });
  doc.setFontSize(9); doc.setTextColor(90, 107, 104); doc.text("Fuente: registros manuales actuales de Meximoney. No es una declaración fiscal.", 44, y + 42);
  doc.save(`meximoney-${type}-${metadata.period}.pdf`);
}
