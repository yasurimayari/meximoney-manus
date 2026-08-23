import { formatDate, formatMoney } from "./finance";

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

export function exportTransactionsCsv(snapshot: any) {
  const categories = new Map(snapshot.categories.map((category: any) => [category.id, category.name]));
  const accounts = new Map(snapshot.accounts.map((account: any) => [account.id, account.name]));
  const rows = [
    ["Fecha", "Tipo", "Ambito", "Importe", "Moneda", "Categoria", "Cuenta", "Estado", "Nota"],
    ...snapshot.transactions.slice().sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).map((transaction: any) => [
      new Date(transaction.occurredAt).toISOString().slice(0, 10), transaction.type, transaction.scope, (transaction.amountCents / 100).toFixed(2), transaction.currency,
      categories.get(transaction.categoryId) || "", accounts.get(transaction.accountId) || "", transaction.status, transaction.notes || "",
    ]),
  ];
  const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(",")).join("\n")}`;
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `meximoney-registros-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportFinancialPdf(snapshot: any) {
  const { jsPDF } = await import("jspdf");
  const currency = snapshot.profile?.currency || "MXN";
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const cashFlow = snapshot.dashboard.cashFlow;
  const netWorth = snapshot.dashboard.netWorth;
  const liquidity = snapshot.dashboard.liquidity;
  const taxReserve = snapshot.profile?.futureTaxReserveCents || 0;
  const title = "Informe financiero Meximoney";
  const width = document.internal.pageSize.getWidth();
  let y = 58;
  document.setFillColor(0, 91, 81);
  document.rect(0, 0, width, 118, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(24);
  document.text(title, 44, 52);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(`Generado el ${formatDate(new Date())} · Datos registrados manualmente`, 44, 80);
  document.setTextColor(28, 56, 54);
  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  y = 156;
  document.text("Resumen del periodo", 44, y);
  y += 28;
  const summary = [
    ["Ingresos", formatMoney(cashFlow.incomeCents, currency)], ["Gastos", formatMoney(cashFlow.expenseCents, currency)],
    ["Flujo neto", formatMoney(cashFlow.netCashFlowCents, currency)], ["Patrimonio neto", formatMoney(netWorth.netWorthCents, currency)],
    ["Liquidez disponible", formatMoney(liquidity.liquidCents, currency)], ["Deuda activa", formatMoney(netWorth.liabilityCents, currency)],
    ["Reserva fiscal futura manual", formatMoney(taxReserve, currency)],
  ];
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  summary.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 44 + column * 255;
    const rowY = y + row * 34;
    document.setFillColor(246, 249, 247);
    document.roundedRect(x, rowY - 16, 230, 26, 5, 5, "F");
    document.setTextColor(90, 107, 104);
    document.text(label, x + 10, rowY);
    document.setFont("helvetica", "bold");
    document.setTextColor(28, 56, 54);
    document.text(value, x + 218, rowY, { align: "right" });
    document.setFont("helvetica", "normal");
  });
  y += 150;
  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text("Movimientos recientes", 44, y);
  y += 22;
  document.setFontSize(9);
  const recent = snapshot.transactions.slice().sort((a: any, b: any) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 16);
  if (recent.length === 0) {
    document.setFont("helvetica", "normal");
    document.setTextColor(90, 107, 104);
    document.text("No hay movimientos manuales registrados para incluir.", 44, y);
  } else {
    recent.forEach((transaction: any, index: number) => {
      if (y > 740) { document.addPage(); y = 54; }
      document.setDrawColor(224, 233, 229);
      document.line(44, y + 7, width - 44, y + 7);
      document.setTextColor(28, 56, 54);
      document.setFont("helvetica", "normal");
      document.text(formatDate(transaction.occurredAt), 44, y);
      document.text(transaction.type, 118, y);
      document.text(transaction.scope === "business" ? "Empresarial" : transaction.scope === "mixed" ? "Mixto" : "Personal", 214, y);
      document.setFont("helvetica", "bold");
      document.text(formatMoney(transaction.amountCents, transaction.currency), width - 44, y, { align: "right" });
      y += 22;
    });
  }
  y += 34;
  if (y > 710) { document.addPage(); y = 54; }
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text("Nota de alcance", 44, y);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(90, 107, 104);
  const note = "Este informe organiza exclusivamente los datos manuales de Meximoney. No es una declaración fiscal, una recomendación de inversión ni una instrucción de pago.";
  document.text(document.splitTextToSize(note, width - 88), 44, y + 18);
  document.save(`meximoney-informe-${new Date().toISOString().slice(0, 10)}.pdf`);
}
