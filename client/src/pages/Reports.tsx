import { Button } from "@/components/ui/button";
import { exportFinancialPdf, exportTransactionsCsv } from "@/lib/reportExport";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { Download, FileDown, FileSpreadsheet, FileText, LockKeyhole, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Reports() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery();
  const [entityId, setEntityId] = useState("");
  const csvSnapshot = useMemo(() => {
    if (!data || !entityId) return data;
    const selectedEntityId = Number(entityId);
    return { ...data, transactions: data.transactions.filter((transaction: any) => transaction.entityId === selectedEntityId) };
  }, [data, entityId]);
  if (isLoading || !data) return <div className="page-loading">Preparando tus exportaciones privadas…</div>;
  const currency = data.dashboard.reportCurrency ?? data.profile?.currency ?? "MXN";
  const exportPdf = async () => {
    try { await exportFinancialPdf(data); toast.success("El informe PDF se ha descargado."); }
    catch { toast.error("No se pudo generar el PDF. Inténtalo de nuevo."); }
  };
  return <div className="reports-page"><header className="page-heading"><div><p className="eyebrow">Exportación privada</p><h1>Convierte tus registros en documentación útil.</h1><p>Descarga archivos generados únicamente con los datos manuales de tu espacio de Meximoney.</p></div><div className="form-field min-w-48"><Label htmlFor="report-entity">Entidad para CSV</Label><select id="report-entity" value={entityId} onChange={event => setEntityId(event.target.value)}><option value="">Todas las entidades</option>{data.entities.map((entity: any) => <option key={entity.id} value={entity.id}>{entity.shortCode || entity.name}</option>)}</select></div></header><section className="report-actions-grid"><article className="report-action-card"><div className="report-icon"><FileSpreadsheet className="size-6" /></div><p className="eyebrow">Registros estructurados</p><h2>Exportar movimientos en CSV</h2><p>Incluye entidad, proyecto, moneda original, importe reportado, tipo de cambio manual, revisión y nota. {entityId ? "El archivo se limitará a la entidad seleccionada." : "El archivo incluirá todas las entidades."}</p><Button className="btn-primary" onClick={() => { exportTransactionsCsv(csvSnapshot ?? data); toast.success("Se ha descargado el archivo CSV."); }}><Download className="size-4" /> Descargar CSV</Button></article><article className="report-action-card report-action-featured"><div className="report-icon"><FileDown className="size-6" /></div><p className="eyebrow">Informe ejecutivo</p><h2>Generar informe financiero PDF</h2><p>Resume flujo de caja, patrimonio, liquidez, deuda, reserva fiscal manual, movimientos recientes y cierres mensuales guardados, sin mezclar divisas pendientes de convertir.</p><Button variant="secondary" onClick={exportPdf}><FileText className="size-4" /> Descargar PDF</Button></article></section><section className="content-card report-preview"><div className="card-title-row"><div><h2>Contenido del próximo informe</h2><p>Vista previa de los indicadores que se incluirán.</p></div><ReceiptText className="size-5 text-primary" /></div><div className="report-preview-grid"><PreviewItem label="Periodo" value={formatDate(data.dashboard.periodStart, { month: "long", year: "numeric" })} /><PreviewItem label="Flujo neto" value={formatMoney(data.dashboard.cashFlow.netCashFlowCents, currency)} /><PreviewItem label="Patrimonio neto" value={formatMoney(data.dashboard.netWorth.netWorthCents, currency)} /><PreviewItem label="Liquidez" value={formatMoney(data.dashboard.liquidity.liquidCents, currency)} /><PreviewItem label="Movimientos incluidos" value={`${Math.min((csvSnapshot ?? data).transactions.length, 16)} recientes`} /><PreviewItem label="Cierres mensuales" value={`${data.statements.length} guardados`} /><PreviewItem label="Reserva fiscal manual" value={formatMoney(data.profile?.futureTaxReserveCents ?? 0, currency)} /></div></section><section className="report-notice"><LockKeyhole className="size-5" /><div><strong>Alcance de las exportaciones</strong><p>Los archivos no contienen credenciales bancarias ni ejecutan pagos. El PDF es un resumen organizativo; los cierres guardados no sustituyen contabilidad profesional, declaraciones fiscales ni documentación oficial.</p></div></section></div>;
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong className="capitalize">{value}</strong></div>;
}
