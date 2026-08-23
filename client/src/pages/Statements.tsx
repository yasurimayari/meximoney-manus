import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, scopeLabel } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, BadgeDollarSign, BookOpenCheck, Landmark, Save, WalletCards } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Statements() {
  const utils = trpc.useUtils();
  const { data: snapshot, isLoading } = trpc.finance.dashboard.useQuery();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [scope, setScope] = useState<"personal" | "business" | "mixed">("personal");
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState<"draft" | "closed">("draft");
  const [notes, setNotes] = useState("");
  const statementInput = useMemo(() => ({ periodStart: new Date(`${period}-01T12:00:00`).getTime(), scope, entityId: entityId ? Number(entityId) : null }), [period, scope, entityId]);
  const preview = trpc.finance.statements.preview.useQuery(statementInput);
  const save = trpc.finance.statements.save.useMutation({ onSuccess: () => { toast.success("Estado mensual guardado"); utils.finance.dashboard.invalidate(); }, onError: error => toast.error(error.message) });
  const currency = snapshot?.dashboard.reportCurrency ?? snapshot?.profile?.currency ?? "MXN";
  const savedStatements = useMemo(() => (snapshot?.statements ?? []).slice().sort((a: any, b: any) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()), [snapshot?.statements]);
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate({ ...statementInput, status, notes: notes || null }); };

  if (isLoading || !snapshot) return <div className="page-loading">Preparando los estados mensuales privados…</div>;
  if (preview.isError) return <div className="content-card"><h1>Estados mensuales</h1><p className="mt-3 text-muted-foreground">Necesitas aceptar el almacenamiento manual de datos desde Calidad para calcular y guardar estados financieros privados.</p></div>;
  const statement = preview.data;
  return <div className="space-y-7">
    <header className="page-heading"><div><p className="eyebrow">Cierre contable manual</p><h1>Estados financieros mensuales</h1><p>Resume resultados, flujo de efectivo y situación patrimonial con tus registros manuales. No sustituye contabilidad profesional ni declaraciones fiscales.</p></div><div className="statement-scope-pill">{scopeLabel[scope]}</div></header>
    <form className="content-card statement-controls" onSubmit={submit}><div className="form-field"><Label>Periodo</Label><Input type="month" value={period} onChange={event => setPeriod(event.target.value)} /></div><div className="form-field"><Label>Ámbito</Label><select value={scope} onChange={event => setScope(event.target.value as any)}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Consolidado manual</option></select></div><div className="form-field"><Label>Entidad</Label><select value={entityId} onChange={event => setEntityId(event.target.value)}><option value="">Todas / personal</option>{snapshot.entities.map((entity: any) => <option key={entity.id} value={entity.id}>{entity.shortCode || entity.name}</option>)}</select></div><div className="form-field"><Label>Estado del cierre</Label><select value={status} onChange={event => setStatus(event.target.value as any)}><option value="draft">Borrador</option><option value="closed">Cerrado</option></select></div><div className="form-field statement-note"><Label>Notas del cierre</Label><Textarea placeholder="Alcance, conciliaciones pendientes o criterios manuales" value={notes} onChange={event => setNotes(event.target.value)} /></div><Button type="submit" className="btn-primary" disabled={save.isPending}><Save className="size-4" /> {save.isPending ? "Guardando…" : "Guardar estado"}</Button></form>
    {preview.isLoading || !statement ? <div className="page-loading">Calculando el periodo…</div> : <><section className="statement-section"><div className="section-heading"><div><p className="eyebrow">Estado de resultados</p><h2>Ingresos, gastos y resultado del periodo</h2></div><BadgeDollarSign className="size-5 text-primary" /></div><div className="statement-grid"><StatementMetric icon={ArrowUpRight} label="Ingresos registrados" value={statement.incomeCents} currency={currency} tone="positive" /><StatementMetric icon={ArrowDownRight} label="Gastos registrados" value={statement.expenseCents} currency={currency} tone="negative" /><StatementMetric icon={WalletCards} label="Resultado / flujo neto" value={statement.netCashFlowCents} currency={currency} tone={statement.netCashFlowCents >= 0 ? "positive" : "negative"} /></div></section><section className="statement-section"><div className="section-heading"><div><p className="eyebrow">Situación patrimonial</p><h2>Activos, pasivos y patrimonio neto</h2></div><Landmark className="size-5 text-primary" /></div><div className="statement-grid"><StatementMetric icon={Landmark} label="Activos manuales activos" value={statement.assetCents} currency={currency} /><StatementMetric icon={ArrowDownRight} label="Pasivos y deudas activas" value={statement.liabilityCents} currency={currency} tone="negative" /><StatementMetric icon={BookOpenCheck} label="Patrimonio neto" value={statement.netWorthCents} currency={currency} tone={statement.netWorthCents >= 0 ? "positive" : "negative"} /><StatementMetric icon={WalletCards} label="Liquidez disponible" value={statement.liquidCents} currency={currency} /></div><p className="statement-caveat">Los activos y deudas reflejan sus valores manuales vigentes al momento de guardar el cierre. Para conservar una foto histórica, guarda el estado al finalizar cada mes.</p></section></>}
    <section className="content-card"><div className="card-title-row"><div><p className="eyebrow">Archivo privado</p><h2>Cierres guardados</h2></div><span className="text-sm text-muted-foreground">{savedStatements.length} estados</span></div>{savedStatements.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aún no has guardado un cierre. El cálculo visible se actualiza con los registros manuales actuales.</p> : <div className="statement-history">{savedStatements.map((item: any) => <article key={item.id}><div><span className={`scope-pill scope-${item.scope}`}>{scopeLabel[item.scope]}</span><strong className="capitalize">{formatDate(item.periodStart, { month: "long", year: "numeric" })}</strong><small>{item.entityId ? `${snapshot.entities.find((entity: any) => entity.id === item.entityId)?.shortCode || "Entidad"} · ` : ""}{item.status === "closed" ? "Cerrado" : "Borrador"}{item.notes ? ` · ${item.notes}` : ""}</small></div><div><span>Resultado</span><strong className={item.netCashFlowCents >= 0 ? "amount-positive" : "amount-negative"}>{formatMoney(item.netCashFlowCents, currency)}</strong></div><div><span>Patrimonio</span><strong>{formatMoney(item.netWorthCents, currency)}</strong></div></article>)}</div>}</section>
  </div>;
}

function StatementMetric({ icon: Icon, label, value, currency, tone }: { icon: typeof Landmark; label: string; value: number; currency: string; tone?: "positive" | "negative" }) {
  return <article className="statement-metric"><div className={`statement-icon ${tone ?? ""}`}><Icon className="size-4" /></div><span>{label}</span><strong className={tone === "positive" ? "amount-positive" : tone === "negative" ? "amount-negative" : ""}>{formatMoney(value, currency)}</strong></article>;
}
