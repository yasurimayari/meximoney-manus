import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

export type AmortizationPayment = { id: number; paidAt: Date | string; totalPaymentCents: number; principalCents: number; interestCents: number; lateInterestCents: number; feeCents: number };
export type AmortizationProjection = { rows: Array<{ installment: number; openingBalanceCents: number; regularInterestCents: number; plannedPaymentCents: number; principalCents: number; closingBalanceCents: number }>; totalProjectedInterestCents: number; warning?: string | null };
export type AmortizationAdjustment = { id: number; occurredAt: Date | string; type: string; amountCents: number; notes?: string | null };
export type AmortizationDebt = { id: number; name: string; currency: string; balanceCents: number };

export type AmortizationSummary = { capitalPaidCents: number; regularInterestPaidCents: number; lateInterestPaidCents: number; feesPaidCents: number; totalInterestPaidCents: number; totalPaidCents: number; capitalRemainingCents: number };

export function buildAmortizationSummary(debt: AmortizationDebt, payments: AmortizationPayment[]): AmortizationSummary {
  return payments.reduce((summary, payment) => ({
    capitalPaidCents: summary.capitalPaidCents + payment.principalCents,
    regularInterestPaidCents: summary.regularInterestPaidCents + payment.interestCents,
    lateInterestPaidCents: summary.lateInterestPaidCents + payment.lateInterestCents,
    feesPaidCents: summary.feesPaidCents + payment.feeCents,
    totalInterestPaidCents: summary.totalInterestPaidCents + payment.interestCents + payment.lateInterestCents,
    totalPaidCents: summary.totalPaidCents + payment.totalPaymentCents,
    capitalRemainingCents: debt.balanceCents,
  }), { capitalPaidCents: 0, regularInterestPaidCents: 0, lateInterestPaidCents: 0, feesPaidCents: 0, totalInterestPaidCents: 0, totalPaidCents: 0, capitalRemainingCents: debt.balanceCents });
}

export function buildAmortizationWorkbook(debt: AmortizationDebt, payments: AmortizationPayment[], projection: AmortizationProjection, adjustments: AmortizationAdjustment[]) {
  const summary = buildAmortizationSummary(debt, payments);
  const money = (value: number) => value / 100;
  const book = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Richeon · Amortización"],
    ["Activo o deuda", debt.name], ["Moneda", debt.currency], ["Capital pagado", money(summary.capitalPaidCents)], ["Intereses ordinarios pagados", money(summary.regularInterestPaidCents)], ["Intereses vencidos pagados", money(summary.lateInterestPaidCents)], ["Cargos pagados", money(summary.feesPaidCents)], ["Capital restante", money(summary.capitalRemainingCents)], ["Interés proyectado restante", money(projection.totalProjectedInterestCents)], ["Nota", "Información manual para revisión; no sustituye el estado de cuenta del acreedor."],
  ]);
  summarySheet["!cols"] = [{ wch: 34 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(book, summarySheet, "Resumen");
  const paymentsSheet = XLSX.utils.json_to_sheet(payments.map(payment => ({ Fecha: new Date(payment.paidAt).toISOString().slice(0, 10), "Pago total": money(payment.totalPaymentCents), Capital: money(payment.principalCents), "Interés ordinario": money(payment.interestCents), "Interés vencido": money(payment.lateInterestCents), Cargos: money(payment.feeCents) })));
  paymentsSheet["!cols"] = [{ wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 21 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(book, paymentsSheet, "Pagos conciliados");
  const projectionSheet = XLSX.utils.json_to_sheet(projection.rows.map(row => ({ Cuota: row.installment, "Saldo inicial": money(row.openingBalanceCents), "Interés ordinario": money(row.regularInterestCents), "Pago de referencia": money(row.plannedPaymentCents), Capital: money(row.principalCents), "Saldo final": money(row.closingBalanceCents) })));
  projectionSheet["!cols"] = [{ wch: 10 }, { wch: 16 }, { wch: 21 }, { wch: 21 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(book, projectionSheet, "Proyección");
  const adjustmentSheet = XLSX.utils.json_to_sheet(adjustments.map(adjustment => ({ Fecha: new Date(adjustment.occurredAt).toISOString().slice(0, 10), Tipo: adjustment.type, Importe: money(adjustment.amountCents), Nota: adjustment.notes ?? "" })));
  adjustmentSheet["!cols"] = [{ wch: 13 }, { wch: 20 }, { wch: 16 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(book, adjustmentSheet, "Cargos manuales");
  return book;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function money(value: number, currency: string) { return new Intl.NumberFormat("es-MX", { style: "currency", currency, minimumFractionDigits: 2 }).format(value / 100); }
function titleForAdjustment(type: string) { return type === "late_interest" ? "Interés vencido" : type === "finance_charge" ? "Cargo financiero" : type === "other_charge" ? "Otro cargo" : "Corrección"; }

export function exportAmortization(kind: "xlsx" | "pdf", debt: AmortizationDebt, payments: AmortizationPayment[], projection: AmortizationProjection, adjustments: AmortizationAdjustment[]) {
  const safeName = debt.name.toLocaleLowerCase("es-MX").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "") || `deuda-${debt.id}`;
  const filename = `meximoney-amortizacion-${safeName}-${new Date().toISOString().slice(0, 10)}`;
  if (kind === "xlsx") { XLSX.writeFile(buildAmortizationWorkbook(debt, payments, projection, adjustments), `${filename}.xlsx`); return; }
  const summary = buildAmortizationSummary(debt, payments); const document = new jsPDF({ unit: "pt", format: "a4" }); const width = document.internal.pageSize.getWidth(); const height = document.internal.pageSize.getHeight(); let y = 46;
  const header = (continued = false) => { document.setFillColor(0, 91, 81); document.rect(0, 0, width, continued ? 48 : 106, "F"); document.setTextColor(255, 255, 255); document.setFont("helvetica", "bold"); document.setFontSize(17); document.text(continued ? "Amortización · continuación" : "Richeon · Amortización", 42, 37); if (!continued) { document.setFont("helvetica", "normal"); document.setFontSize(9); document.text(debt.name, 42, 59); document.text(`Generado el ${new Date().toLocaleDateString("es-MX")} · Datos manuales`, 42, 79); } y = continued ? 76 : 136; };
  const ensureSpace = (space: number) => { if (y + space > height - 44) { document.addPage(); header(true); } };
  header(); document.setTextColor(28, 56, 54); document.setFontSize(9); document.setFont("helvetica", "bold");
  [["Capital pagado", summary.capitalPaidCents], ["Intereses pagados", summary.totalInterestPaidCents], ["Capital restante", summary.capitalRemainingCents]].forEach(([label, value], index) => { const x = 42 + index * 172; document.setFillColor(238, 245, 243); document.roundedRect(x, y, 156, 48, 6, 6, "F"); document.setTextColor(44, 75, 71); document.setFontSize(7.5); document.text(String(label).toUpperCase(), x + 10, y + 16); document.setFont("helvetica", "bold"); document.setFontSize(11); document.setTextColor(0, 91, 81); document.text(money(Number(value), debt.currency), x + 10, y + 35); }); y += 76;
  const tableHeader = (labels: string[], positions: number[]) => { ensureSpace(28); document.setFillColor(238, 245, 243); document.rect(42, y - 15, width - 84, 19, "F"); document.setTextColor(44, 75, 71); document.setFont("helvetica", "bold"); document.setFontSize(7); labels.forEach((label, index) => document.text(label, positions[index], y - 3, { align: index ? "right" : "left" })); y += 14; };
  document.setTextColor(28, 56, 54); document.setFont("helvetica", "bold"); document.setFontSize(12); document.text("Pagos conciliados", 42, y); y += 20; tableHeader(["FECHA", "TOTAL", "CAPITAL", "INT. ORD.", "INT. VENC.", "CARGOS"], [50, 214, 300, 384, 468, width - 50]);
  if (!payments.length) { document.setFont("helvetica", "normal"); document.setFontSize(9); document.setTextColor(90, 107, 104); document.text("Sin cuotas conciliadas todavía.", 50, y); y += 20; }
  payments.forEach(payment => { ensureSpace(17); document.setFont("helvetica", "normal"); document.setFontSize(7.5); document.setTextColor(28, 56, 54); const positions = [50, 214, 300, 384, 468, width - 50]; [new Date(payment.paidAt).toLocaleDateString("es-MX"), money(payment.totalPaymentCents, debt.currency), money(payment.principalCents, debt.currency), money(payment.interestCents, debt.currency), money(payment.lateInterestCents, debt.currency), money(payment.feeCents, debt.currency)].forEach((value, index) => document.text(value, positions[index], y, { align: index ? "right" : "left" })); y += 14; });
  ensureSpace(30); document.setFont("helvetica", "bold"); document.setFontSize(12); document.text("Proyección de amortización", 42, y); y += 20; tableHeader(["CUOTA", "SALDO INICIAL", "INTERÉS", "PAGO REF.", "CAPITAL", "SALDO FINAL"], [50, 160, 265, 360, 460, width - 50]);
  projection.rows.forEach(row => { ensureSpace(17); document.setFont("helvetica", "normal"); document.setFontSize(7.5); document.setTextColor(28, 56, 54); const positions = [50, 160, 265, 360, 460, width - 50]; [String(row.installment), money(row.openingBalanceCents, debt.currency), money(row.regularInterestCents, debt.currency), money(row.plannedPaymentCents, debt.currency), money(row.principalCents, debt.currency), money(row.closingBalanceCents, debt.currency)].forEach((value, index) => document.text(value, positions[index], y, { align: index ? "right" : "left" })); y += 14; });
  if (adjustments.length) { ensureSpace(30); document.setFont("helvetica", "bold"); document.setFontSize(12); document.text("Cargos manuales", 42, y); y += 20; adjustments.forEach(adjustment => { ensureSpace(22); document.setFont("helvetica", "normal"); document.setFontSize(8); document.setTextColor(28, 56, 54); document.text(`${new Date(adjustment.occurredAt).toLocaleDateString("es-MX")} · ${titleForAdjustment(adjustment.type)}`, 50, y); document.text(money(adjustment.amountCents, debt.currency), width - 50, y, { align: "right" }); if (adjustment.notes) { document.setTextColor(90, 107, 104); document.setFontSize(7.2); document.text(document.splitTextToSize(adjustment.notes, width - 108), 50, y + 10); } y += adjustment.notes ? 28 : 16; }); }
  const pageCount = document.getNumberOfPages(); for (let page = 1; page <= pageCount; page += 1) { document.setPage(page); document.setFont("helvetica", "normal"); document.setFontSize(7.2); document.setTextColor(90, 107, 104); document.text(`Richeon · Página ${page} de ${pageCount} · Información manual para revisión`, width - 42, height - 24, { align: "right" }); }
  document.save(`${filename}.pdf`);
}
