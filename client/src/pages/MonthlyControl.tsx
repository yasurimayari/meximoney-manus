import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { buildMonthlyControlSummary } from "../../../shared/monthlyControl";
import { AlertTriangle, ArrowUpRight, BadgeCheck, CalendarDays, CheckCircle2, ClipboardCheck, Landmark, ReceiptText, Save, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Checks = {
  transactionsConfirmed: boolean;
  qualityConfirmed: boolean;
  calendarConfirmed: boolean;
  obligationsConfirmed: boolean;
  fiscalConfirmed: boolean;
  patrimonyConfirmed: boolean;
};

const emptyChecks: Checks = { transactionsConfirmed: false, qualityConfirmed: false, calendarConfirmed: false, obligationsConfirmed: false, fiscalConfirmed: false, patrimonyConfirmed: false };

export default function MonthlyControl() {
  const utils = trpc.useUtils();
  const { data: snapshot, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [checks, setChecks] = useState<Checks>(emptyChecks);
  const [status, setStatus] = useState<"draft" | "reviewed" | "closed">("draft");
  const [observations, setObservations] = useState("");
  const [nextActions, setNextActions] = useState("");
  const periodStart = useMemo(() => new Date(`${period}-01T12:00:00`), [period]);
  const currentReview = useMemo(() => (snapshot?.reviews ?? []).filter((review: any) => new Date(review.periodStart).getFullYear() === periodStart.getFullYear() && new Date(review.periodStart).getMonth() === periodStart.getMonth()).sort((left: any, right: any) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0], [periodStart, snapshot?.reviews]);
  const currentControl = useMemo(() => (snapshot?.monthlyReviewControls ?? []).find((control: any) => control.monthlyReviewId === currentReview?.id), [currentReview?.id, snapshot?.monthlyReviewControls]);
  const summary = useMemo(() => snapshot ? buildMonthlyControlSummary(snapshot, periodStart) : null, [periodStart, snapshot]);
  const save = trpc.finance.monthlyControl.save.useMutation({
    onSuccess: async () => { await utils.finance.dashboard.invalidate(); toast.success("Control mensual guardado. Ningún movimiento ni saldo fue modificado."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setChecks(currentControl ? {
      transactionsConfirmed: currentControl.transactionsConfirmed,
      qualityConfirmed: currentControl.qualityConfirmed,
      calendarConfirmed: currentControl.calendarConfirmed,
      obligationsConfirmed: currentControl.obligationsConfirmed,
      fiscalConfirmed: currentControl.fiscalConfirmed,
      patrimonyConfirmed: currentControl.patrimonyConfirmed,
    } : emptyChecks);
    setStatus(currentReview?.status ?? "draft");
    setObservations(currentReview?.observations ?? "");
    setNextActions(currentReview?.nextActions ?? "");
  }, [currentControl, currentReview, period]);

  if (isLoading || !snapshot || !summary) return <div className="page-loading">Preparando el control mensual manual…</div>;

  const sections = [
    { key: "transactionsConfirmed" as const, title: "Movimientos y revisión", detail: summary.pendingTransactionCount ? `${summary.pendingTransactionCount} movimiento(s) pendiente(s) de revisión.` : "No hay movimientos pendientes de revisión.", link: "/revision", linkLabel: "Abrir revisión", icon: ClipboardCheck, attention: summary.pendingTransactionCount > 0 },
    { key: "qualityConfirmed" as const, title: "Calidad de datos", detail: summary.qualityIssueCount ? `${summary.qualityIssueCount} alerta(s) de calidad activa(s).` : "Sin alertas básicas activas.", link: "/calidad", linkLabel: "Revisar calidad", icon: ShieldCheck, attention: summary.qualityIssueCount > 0 },
    { key: "calendarConfirmed" as const, title: "Agenda y vencimientos", detail: `${summary.scheduledItemCount} evento(s) o tarea(s) manual(es) del periodo.`, link: "/calendario", linkLabel: "Ver calendario", icon: CalendarDays, attention: summary.scheduledItemCount > 0 },
    { key: "obligationsConfirmed" as const, title: "Tarjetas y deudas", detail: `${summary.obligationCount} referencia(s) de pago y ${summary.missingObligationDateCount} dato(s) de ciclo o vencimiento pendiente(s).`, link: "/planificacion", linkLabel: "Revisar obligaciones", icon: WalletCards, attention: summary.obligationCount > 0 || summary.missingObligationDateCount > 0 },
    { key: "fiscalConfirmed" as const, title: "Libro PFAE", detail: summary.fiscalRecordCount ? `${summary.fiscalPendingCount} renglón(es) pendiente(s); rutina ${summary.fiscalRoutineReviewed ? "revisada" : "abierta"}.` : "Sin renglones PFAE en el periodo.", link: "/fiscal", linkLabel: "Abrir Libro PFAE", icon: ReceiptText, attention: summary.fiscalPendingCount > 0 || (summary.fiscalRecordCount > 0 && !summary.fiscalRoutineReviewed) },
    { key: "patrimonyConfirmed" as const, title: "Patrimonio y fotografía", detail: summary.hasClosedStatement ? `Hay una fotografía financiera cerrada. ${summary.patrimonyAttentionCount ? `${summary.patrimonyAttentionCount} alerta(s) de valoración siguen activa(s).` : ""}` : "Aún no hay fotografía financiera cerrada para este periodo.", link: "/estados", linkLabel: "Ver estados", icon: Landmark, attention: !summary.hasClosedStatement || summary.patrimonyAttentionCount > 0 },
  ];
  const confirmedCount = Object.values(checks).filter(Boolean).length;
  const saveControl = () => save.mutate({ periodStart: periodStart.getTime(), status, observations: observations || null, nextActions: nextActions || null, checks });

  return <div className="space-y-7"><header className="page-heading"><div><p className="eyebrow">Fase D · rutina humana</p><h1>Control mensual</h1><p>Concentra tus pendientes antes de cerrar el mes. Los indicadores sólo leen registros manuales existentes; confirmar un bloque no aprueba, paga, cierra ni modifica sus datos.</p></div><div className="flex items-center gap-3"><div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm"><strong>{confirmedCount}/6</strong><span className="ml-1 text-muted-foreground">bloques confirmados</span></div><Input className="w-[160px]" aria-label="Periodo de control mensual" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></div></header>
    <section className="grid gap-4 lg:grid-cols-3"><article className="content-card lg:col-span-2"><div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 size-5 text-primary"/><div><h2 className="text-lg font-semibold capitalize">{formatDate(periodStart, { month: "long", year: "numeric" })}</h2><p className="mt-1 text-sm text-muted-foreground">{currentReview ? `Rutina guardada como ${status === "closed" ? "cerrada" : status === "reviewed" ? "revisada" : "borrador"}.` : "Aún no existe una rutina guardada para este periodo."}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/50 p-3"><span className="text-xs text-muted-foreground">Pendientes de revisión</span><strong className="mt-1 block text-xl">{summary.pendingTransactionCount}</strong></div><div className="rounded-xl bg-muted/50 p-3"><span className="text-xs text-muted-foreground">Alertas de calidad</span><strong className="mt-1 block text-xl">{summary.qualityIssueCount}</strong></div><div className="rounded-xl bg-muted/50 p-3"><span className="text-xs text-muted-foreground">Vencimientos de obligación</span><strong className="mt-1 block text-xl">{summary.obligationCount}</strong></div></div></article><article className="content-card border-amber-200 bg-amber-50/60"><AlertTriangle className="size-5 text-amber-700"/><h2 className="mt-3 text-base font-semibold text-amber-950">Límite manual</h2><p className="mt-1 text-sm leading-6 text-amber-900">Esta página no calcula impuestos, no envía recordatorios, no ejecuta pagos y no cierra estados por sí sola.</p></article></section>
    <section className="space-y-3">{sections.map(section => { const Icon = section.icon; return <article className="content-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" key={section.key}><div className="flex min-w-0 items-start gap-3"><div className={`rounded-xl p-2 ${section.attention ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"}`}><Icon className="size-4"/></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{section.title}</h2>{section.attention ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Atención manual</span> : null}</div><p className="mt-1 text-sm text-muted-foreground">{section.detail}</p><Link href={section.link} className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"><ArrowUpRight className="mr-1 size-3.5"/>{section.linkLabel}</Link></div></div><label className="flex shrink-0 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-medium"><input className="size-4 accent-primary" type="checkbox" checked={checks[section.key]} onChange={event => setChecks(current => ({ ...current, [section.key]: event.target.checked }))}/><span>Revisado manualmente</span></label></article>; })}</section>
    <section className="content-card"><div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">Cierre narrativo</p><h2 className="text-lg font-semibold">Observaciones y siguientes acciones</h2><p className="mt-1 text-sm text-muted-foreground">Elige el estado conscientemente. Guardar conserva únicamente esta rutina y sus confirmaciones.</p></div><select className="w-full sm:w-44" aria-label="Estado del control mensual" value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="draft">Borrador</option><option value="reviewed">Revisada</option><option value="closed">Cerrada</option></select></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="form-field"><Label htmlFor="monthly-control-observations">Observaciones</Label><Textarea id="monthly-control-observations" maxLength={5000} placeholder="Qué comprobaste, qué sigue pendiente o qué cambió este mes." value={observations} onChange={event => setObservations(event.target.value)} /></div><div className="form-field"><Label htmlFor="monthly-control-actions">Siguientes acciones</Label><Textarea id="monthly-control-actions" maxLength={5000} placeholder="Acciones manuales concretas para el siguiente periodo." value={nextActions} onChange={event => setNextActions(event.target.value)} /></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">Al guardar no se modifican movimientos, tarjetas, deudas, PFAE ni estados financieros. El cierre de patrimonio se mantiene en Estados mensuales.</p><Button className="btn-primary" disabled={save.isPending} onClick={saveControl}><Save className="size-4"/>{save.isPending ? "Guardando…" : "Guardar control"}</Button></div></section>
  </div>;
}
