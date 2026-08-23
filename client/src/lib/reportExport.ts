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
  const entities = new Map((snapshot.entities ?? []).map((entity: any) => [entity.id, entity.shortCode || entity.name]));
  const projects = new Map((snapshot.projects ?? []).map((project: any) => [project.id, project.name]));
  const rows = [
    ["Fecha", "Tipo", "Ámbito", "Entidad", "Proyecto", "Importe original", "Moneda original", "Moneda de reporte", "Importe reportado", "Tipo de cambio manual", "Naturaleza del ingreso", "Categoría", "Cuenta", "Estado del dato", "Estado de revisión", "Nota"],
    ...snapshot.transactions.slice().sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).map((transaction: any) => [
      new Date(transaction.occurredAt).toISOString().slice(0, 10), transaction.type, transaction.scope, entities.get(transaction.entityId) || "", projects.get(transaction.projectId) || "",
      (transaction.amountCents / 100).toFixed(2), transaction.currency, transaction.reportCurrency || "", typeof transaction.reportAmountCents === "number" ? (transaction.reportAmountCents / 100).toFixed(2) : "",
      typeof transaction.exchangeRateMicros === "number" ? (transaction.exchangeRateMicros / 1_000_000).toString() : "", transaction.incomeNature || "",
      categories.get(transaction.categoryId) || "", accounts.get(transaction.accountId) || "", transaction.status, transaction.reviewStatus || "", transaction.notes || "",
    ]),
  ];
  const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(",")).join("\n")}`;
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `meximoney-registros-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportFinancialPdf(snapshot: any) {
  const { jsPDF } = await import("jspdf");
  const currency = snapshot.dashboard?.reportCurrency || snapshot.profile?.currency || "MXN";
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
    ["Partidas sin conversión", String(cashFlow.pendingConversionCount || 0)],
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
  const entities = new Map((snapshot.entities ?? []).map((entity: any) => [entity.id, entity.shortCode || entity.name]));
  const projects = new Map((snapshot.projects ?? []).map((project: any) => [project.id, project.name]));
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
      document.text(`${transaction.scope === "business" ? "Empresarial" : transaction.scope === "mixed" ? "Mixto" : "Personal"}${entities.get(transaction.entityId) ? ` · ${entities.get(transaction.entityId)}` : ""}${projects.get(transaction.projectId) ? `/${projects.get(transaction.projectId)}` : ""}`, 214, y);
      document.setFont("helvetica", "bold");
      document.text(formatMoney(transaction.amountCents, transaction.currency), width - 44, y, { align: "right" });
      y += 14;
      document.setFont("helvetica", "normal");
      document.setTextColor(90, 107, 104);
      document.setFontSize(7.5);
      const trace = transaction.reportAmountCents === null || transaction.reportAmountCents === undefined ? `Conversión a ${currency} pendiente · ${transaction.reviewStatus === "pending_review" ? "Pendiente de revisión" : transaction.reviewStatus || "Revisado"}` : `Reporte: ${formatMoney(transaction.reportAmountCents, transaction.reportCurrency || currency)} · ${transaction.reviewStatus === "pending_review" ? "Pendiente de revisión" : transaction.reviewStatus || "Aprobado"}`;
      document.text(trace, 44, y);
      document.setFontSize(9);
      y += 14;
    });
  }
  y += 34;
  const statements = (snapshot.statements ?? []).slice().sort((a: any, b: any) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()).slice(0, 8);
  if (statements.length > 0) {
    if (y > 610) { document.addPage(); y = 54; }
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.setTextColor(28, 56, 54);
    document.text("Estados mensuales guardados", 44, y);
    y += 20;
    document.setFontSize(8.5);
    statements.forEach((statement: any) => {
      if (y > 740) { document.addPage(); y = 54; }
      document.setDrawColor(224, 233, 229);
      document.line(44, y + 7, width - 44, y + 7);
      document.setFont("helvetica", "normal");
      const scope = statement.scope === "business" ? "Empresarial" : statement.scope === "mixed" ? "Consolidado" : "Personal";
      document.text(`${formatDate(statement.periodStart)} · ${scope} · ${statement.status === "closed" ? "Cerrado" : "Borrador"}`, 44, y);
      document.text(`Flujo: ${formatMoney(statement.netCashFlowCents, currency)}`, 280, y);
      document.setFont("helvetica", "bold");
      document.text(`Patrimonio: ${formatMoney(statement.netWorthCents, currency)}`, width - 44, y, { align: "right" });
      y += 22;
    });
    y += 20;
  }
  if (y > 710) { document.addPage(); y = 54; }
  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.text("Nota de alcance", 44, y);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(90, 107, 104);
  const note = `Este informe organiza exclusivamente los datos manuales de Meximoney. Las cifras consolidadas en ${currency} sólo incluyen partidas con importe original en esa moneda o conversión manual registrada; las partidas pendientes se identifican y no se suman. Los estados mensuales guardados son fotos manuales de los importes registrados al cierre. No es una declaración fiscal, una recomendación de inversión ni una instrucción de pago.`;
  document.text(document.splitTextToSize(note, width - 88), 44, y + 18);
  document.save(`meximoney-informe-${new Date().toISOString().slice(0, 10)}.pdf`);
}
