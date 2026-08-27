import { AmortizationInsights } from "@/components/AmortizationInsights";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { amortizationDialogClass } from "@/lib/amortizationDialogLayout";
import { trpc } from "@/lib/trpc";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

const money = (value: number, currency: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency, minimumFractionDigits: 2 }).format(value / 100);

export function FinancedAssetAmortizationDialog({ debt }: { debt: { id: number; name: string } }) {
  const { data, isLoading } = trpc.finance.debts.amortization.useQuery({ debtId: debt.id });
  const [expanded, setExpanded] = useState(false);
  const dialogClass = `${amortizationDialogClass(expanded)} [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:z-30 [&_[data-slot=dialog-close]]:rounded-md [&_[data-slot=dialog-close]]:bg-background/95 [&_[data-slot=dialog-close]]:p-1 [&_[data-slot=dialog-close]]:shadow-sm`;
  const expandLabel = expanded ? "Reducir" : "Ampliar";

  return <DialogContent className={dialogClass}>
    <Button type="button" size="sm" variant="outline" className="absolute right-12 top-3 z-30 h-8 gap-1.5 bg-background/95 px-2 shadow-sm" aria-label={`${expandLabel} ventana de amortización`} aria-pressed={expanded} title={expandLabel} onClick={() => setExpanded(value => !value)}>
      {expanded ? <Minimize2 className="size-3.5"/> : <Maximize2 className="size-3.5"/>}
      <span className="hidden sm:inline">{expandLabel}</span>
    </Button>
    <DialogHeader className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-border/80 bg-background/95 px-4 pb-4 pt-4 pr-28 text-left backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 sm:pb-5 sm:pt-6 sm:pr-32">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Activo financiado</p>
      <DialogTitle className="text-xl leading-tight tracking-tight sm:text-2xl">Amortización de {debt.name}</DialogTitle>
      <DialogDescription className="max-w-3xl text-xs leading-relaxed sm:text-sm">Consulta de referencia: no registra ni modifica pagos, intereses o cargos.</DialogDescription>
    </DialogHeader>
    {isLoading || !data ? <p className="py-8 text-sm text-muted-foreground">Preparando tabla…</p> : <div className="min-w-0 space-y-6 pb-2">
      <AmortizationInsights debt={data.debt} payments={data.payments} projection={data.projection} adjustments={data.adjustments}/>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Capital e intereses pagados</h3>
        <div className="max-h-[min(46dvh,30rem)] overflow-auto rounded-xl border" aria-label="Tabla de pagos conciliados">
          <table className="w-full min-w-[620px] whitespace-nowrap text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground shadow-sm"><tr><th className="p-2">Fecha</th><th className="p-2 text-right">Pago total</th><th className="p-2 text-right">Capital</th><th className="p-2 text-right">Interés ordinario</th><th className="p-2 text-right">Interés vencido</th><th className="p-2 text-right">Cargos</th></tr></thead>
            <tbody>{data.payments.length ? data.payments.map((payment: any) => <tr className="border-t" key={payment.id}><td className="p-2">{new Date(payment.paidAt).toLocaleDateString("es-MX")}</td><td className="p-2 text-right">{money(payment.totalPaymentCents, data.debt.currency)}</td><td className="p-2 text-right">{money(payment.principalCents, data.debt.currency)}</td><td className="p-2 text-right">{money(payment.interestCents, data.debt.currency)}</td><td className="p-2 text-right">{money(payment.lateInterestCents, data.debt.currency)}</td><td className="p-2 text-right">{money(payment.feeCents, data.debt.currency)}</td></tr>) : <tr><td className="p-5 text-center whitespace-normal text-muted-foreground" colSpan={6}>Aún no hay cuotas conciliadas. Registra una cuota desde Planificación cuando tengas el gasto real confirmado.</td></tr>}</tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-semibold">Escenario de amortización</h3><p className="text-xs text-muted-foreground">Proyección basada en tasa y mensualidad de referencia; no anticipa atrasos ni cargos futuros.</p></div><strong className="text-sm">Interés proyectado: {money(data.projection.totalProjectedInterestCents, data.debt.currency)}</strong></div>
        {data.projection.warning ? <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{data.projection.warning}</p> : null}
        <div className="max-h-[min(46dvh,30rem)] overflow-auto rounded-xl border" aria-label="Tabla de amortización proyectada">
          <table className="w-full min-w-[640px] whitespace-nowrap text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground shadow-sm"><tr><th className="p-2">Cuota</th><th className="p-2 text-right">Saldo inicial</th><th className="p-2 text-right">Interés ordinario</th><th className="p-2 text-right">Pago de referencia</th><th className="p-2 text-right">Capital</th><th className="p-2 text-right">Saldo final</th></tr></thead>
            <tbody>{data.projection.rows.length ? data.projection.rows.map((row: any) => <tr className="border-t" key={row.installment}><td className="p-2">{row.installment}</td><td className="p-2 text-right">{money(row.openingBalanceCents, data.debt.currency)}</td><td className="p-2 text-right">{money(row.regularInterestCents, data.debt.currency)}</td><td className="p-2 text-right">{money(row.plannedPaymentCents, data.debt.currency)}</td><td className="p-2 text-right">{money(row.principalCents, data.debt.currency)}</td><td className="p-2 text-right">{money(row.closingBalanceCents, data.debt.currency)}</td></tr>) : <tr><td className="p-5 text-center whitespace-normal text-muted-foreground" colSpan={6}>Completa la tasa y mensualidad de referencia de la deuda para proyectar cuotas.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>}
  </DialogContent>;
}
