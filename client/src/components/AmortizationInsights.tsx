import { Button } from "@/components/ui/button";
import { buildAmortizationSummary, exportAmortization, type AmortizationAdjustment, type AmortizationDebt, type AmortizationPayment, type AmortizationProjection } from "@/lib/amortizationExport";
import { summarizeDebtStatus } from "../../../shared/debtStatus";
import { FileDown, FileSpreadsheet, PieChart as PieChartIcon } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const money = (value: number, currency: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency, minimumFractionDigits: 2 }).format(value / 100);

export function AmortizationInsights({ debt, payments, projection, adjustments }: { debt: AmortizationDebt; payments: AmortizationPayment[]; projection: AmortizationProjection; adjustments: AmortizationAdjustment[] }) {
  const summary = buildAmortizationSummary(debt, payments);
  const debtStatus = summarizeDebtStatus({ balanceCents: debt.balanceCents, originalAmountCents: (debt as any).originalAmountCents ?? null, nextDueAt: (debt as any).nextDueAt ?? null }, payments, adjustments);
  const chart = [
    { name: "Capital pagado", value: summary.capitalPaidCents, color: "#00796b" },
    { name: "Interés ordinario", value: summary.regularInterestPaidCents, color: "#5c6bc0" },
    { name: "Interés vencido", value: summary.lateInterestPaidCents, color: "#d97706" },
  ].filter(item => item.value > 0);

  return <section className="space-y-4" aria-labelledby="amortization-confirmed-summary">
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 id="amortization-confirmed-summary" className="text-sm font-semibold">Cifras confirmadas</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Pagos conciliados y cargos confirmados manualmente. El saldo vigente se toma del estado actual de la entidad.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="bg-background" onClick={() => exportAmortization("xlsx", debt, payments, projection, adjustments)}><FileSpreadsheet className="mr-1.5 size-4"/>Excel</Button>
        <Button type="button" size="sm" variant="outline" className="bg-background" onClick={() => exportAmortization("pdf", debt, payments, projection, adjustments)}><FileDown className="mr-1.5 size-4"/>PDF</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"><Summary label="Capital pagado" value={summary.capitalPaidCents} currency={debt.currency} tone="text-emerald-700"/><Summary label="Intereses y cargos por atraso" value={debtStatus.documentedAccruedCents + summary.lateInterestPaidCents} currency={debt.currency} tone="text-rose-700"/><Summary label="Saldo actualizado" value={debt.balanceCents} currency={debt.currency} tone="text-rose-700"/><Summary label="Capital restante" value={summary.capitalRemainingCents} currency={debt.currency} tone="text-primary"/></div>
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"><div className="flex items-start gap-2"><PieChartIcon className="mt-0.5 size-4 shrink-0 text-primary"/><div><h4 className="text-sm font-semibold">Proporción de capital e intereses pagados</h4><p className="mt-0.5 text-xs text-muted-foreground">El interés ordinario y vencido se distinguen para facilitar la revisión.</p></div></div>{chart.length ? <div className="mt-3 h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{chart.map(item => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip formatter={(value: number) => money(Number(value), debt.currency)}/><Legend iconType="circle" iconSize={8}/></PieChart></ResponsiveContainer></div> : <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay pagos conciliados para calcular la proporción.</p>}</div>
  </section>;
}

function Summary({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: string }) {
  return <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{money(value, currency)}</p></div>;
}
