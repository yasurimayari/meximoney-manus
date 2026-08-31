import type { ReactNode } from "react";
import { MoneyText } from "@/components/MoneyText";
import { Button } from "@/components/ui/button";
import { exportFinancialPdf, exportTransactionsCsv } from "@/lib/reportExport";
import { formatDate, formatMoney } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { emptyWorkspaceFilters, filterWorkspaceSnapshot, WorkspaceFilterBar } from "@/components/WorkspaceFilterBar";
import { Download, FileDown, FileSpreadsheet, FileText, LockKeyhole, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Reports() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const [workspaceFilters, setWorkspaceFilters] = useState(emptyWorkspaceFilters);
  const reportSnapshot = useMemo<typeof data>(() => data ? filterWorkspaceSnapshot(data, workspaceFilters) : undefined, [data, workspaceFilters]);
  const previewMetrics = useMemo(() => {
    if (!data || !reportSnapshot) return null;
    const currency = data.dashboard.reportCurrency || data.profile?.currency || "MXN"; const start = new Date(data.dashboard.periodStart); const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const reportAmount = (item: any) => item.reportCurrency === currency && typeof item.reportAmountCents === "number" ? item.reportAmountCents : item.currency === currency ? item.amountCents : null;
    const transactions = reportSnapshot.transactions.filter((item: any) => new Date(item.occurredAt) >= start && new Date(item.occurredAt) < end);
    const incomeCents = transactions.filter((item: any) => item.type === "income").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0); const expenseCents = transactions.filter((item: any) => item.type === "expense").reduce((total: number, item: any) => total + (reportAmount(item) ?? 0), 0);
    const accounts = reportSnapshot.accounts.filter((item: any) => item.status === "active" && item.currency === currency); const debts = reportSnapshot.debts.filter((item: any) => (item.status === "active" || item.status === "review") && item.currency === currency);
    const assetCents = accounts.reduce((total: number, item: any) => total + item.currentValueCents, 0); const liabilityCents = debts.reduce((total: number, item: any) => total + item.balanceCents, 0); const liquidCents = accounts.filter((item: any) => item.isLiquid).reduce((total: number, item: any) => total + item.currentValueCents, 0);
    return { netCashFlowCents: incomeCents - expenseCents, netWorthCents: assetCents - liabilityCents, liquidCents };
  }, [data, reportSnapshot]);
  if (isLoading || !data || !reportSnapshot || !previewMetrics) return <div className="page-loading">Preparando tus exportaciones privadas…</div>;
  const currency = data.dashboard.reportCurrency ?? data.profile?.currency ?? "MXN";
  const exportPdf = async () => { try { await exportFinancialPdf(reportSnapshot); toast.success("El informe PDF se ha descargado."); } catch { toast.error("No se pudo generar el PDF. Inténtalo de nuevo."); } };
  const activeFilters = Object.values(workspaceFilters).some(Boolean);
  return <div className="reports-page"><header className="page-heading"><div><p className="eyebrow">Exportación privada</p><h1>Convierte tus registros en documentación útil.</h1><p>Descarga archivos generados únicamente con los datos manuales de tu espacio de Meximoney.</p></div></header><WorkspaceFilterBar snapshot={data} filters={workspaceFilters} onChange={setWorkspaceFilters} /><section className="report-actions-grid"><article className="report-action-card"><div className="report-icon"><FileSpreadsheet className="size-6" /></div><p className="eyebrow">Registros estructurados</p><h2>Exportar movimientos en CSV</h2><p>Incluye entidad, proyecto, moneda original, importe reportado, tipo de cambio manual, revisión y nota. {activeFilters ? "El archivo respetará los filtros activos." : "El archivo incluirá el espacio completo."}</p><Button className="btn-primary" onClick={() => { exportTransactionsCsv(reportSnapshot); toast.success("Se ha descargado el archivo CSV."); }}><Download className="size-4" /> Descargar CSV</Button></article><article className="report-action-card report-action-featured"><div className="report-icon"><FileDown className="size-6" /></div><p className="eyebrow">Informe ejecutivo</p><h2>Generar informe financiero PDF</h2><p>Resume el conjunto filtrado sin sumar divisas pendientes de convertir y conserva la trazabilidad de revisión.</p><Button variant="secondary" onClick={exportPdf}><FileText className="size-4" /> Descargar PDF</Button></article></section><section className="content-card report-preview"><div className="card-title-row"><div><h2>Contenido del próximo informe</h2><p>{activeFilters ? "La exportación aplicará los filtros seleccionados." : "Vista previa del espacio completo."}</p></div><ReceiptText className="size-5 text-primary" /></div><div className="report-preview-grid"><PreviewItem label="Periodo" value={formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })} /><PreviewItem label="Flujo neto" value={<MoneyText cents={previewMetrics.netCashFlowCents} currency={currency} />} /><PreviewItem label="Patrimonio neto" value={<MoneyText cents={previewMetrics.netWorthCents} currency={currency} />} /><PreviewItem label="Liquidez" value={<MoneyText cents={previewMetrics.liquidCents} currency={currency} />} /><PreviewItem label="Movimientos incluidos" value={`${Math.min(reportSnapshot.transactions.length, 16)} recientes`} /><PreviewItem label="Cierres mensuales" value={`${reportSnapshot.statements.length} guardados`} /><PreviewItem label="Reserva fiscal manual" value={formatMoney(data.profile?.futureTaxReserveCents ?? 0, currency)} /></div></section><section className="report-notice"><LockKeyhole className="size-5" /><div><strong>Alcance de las exportaciones</strong><p>Los archivos no contienen credenciales bancarias ni ejecutan pagos. El PDF es un resumen organizativo; los cierres guardados no sustituyen contabilidad profesional, declaraciones fiscales ni documentación oficial.</p></div></section></div>;
}

function PreviewItem({ label, value }: { label: string; value: ReactNode }) { return <div><small>{label}</small><strong className="capitalize">{value}</strong></div>; }
