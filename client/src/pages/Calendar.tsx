import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, scopeLabel, toCents } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, CircleDollarSign, FileClock, Landmark, Plus, ReceiptText, XCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type CalendarItem = {
  id: string;
  title: string;
  date: Date;
  kind: string;
  scope: "personal" | "business" | "mixed";
  note: string;
  amountCents?: number | null;
  currency?: string;
  source: "manual" | "deuda" | "documento" | "tarea" | "fiscal";
  event?: any;
};

const eventLabels: Record<string, string> = {
  tax: "Fiscal", credit_card_cutoff: "Corte TDC", credit_card_payment: "Pago TDC", loan_payment: "Pago de préstamo",
  document_expiry: "Vencimiento documental", insurance_renewal: "Renovación de seguro", review: "Revisión", other: "Otro",
};

function eventOccursInMonth(event: any, year: number, month: number) {
  const base = new Date(event.startsAt);
  if (base.getTime() > new Date(year, month + 1, 0, 23, 59, 59).getTime()) return null;
  if (event.recurrence === "none") return base.getFullYear() === year && base.getMonth() === month ? base : null;
  if (event.recurrence === "monthly") return new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate()));
  if (event.recurrence === "quarterly") {
    const offset = (year - base.getFullYear()) * 12 + month - base.getMonth();
    return offset >= 0 && offset % 3 === 0 ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
  }
  return base.getMonth() === month ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
}

export default function Calendar() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.dashboard.useQuery();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dialogOpen, setDialogOpen] = useState(false);
  const currency = data?.profile?.currency ?? "MXN";
  const remove = trpc.finance.calendar.remove.useMutation({ onSuccess: () => utils.finance.dashboard.invalidate(), onError: error => toast.error(error.message) });
  const update = trpc.finance.calendar.save.useMutation({ onSuccess: () => { toast.success("Evento actualizado"); utils.finance.dashboard.invalidate(); }, onError: error => toast.error(error.message) });
  const monthDate = useMemo(() => new Date(`${month}-01T12:00:00`), [month]);

  const items = useMemo<CalendarItem[]>(() => {
    if (!data) return [];
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const generated: CalendarItem[] = [];
    data.calendarEvents.forEach(event => {
      const occurrence = eventOccursInMonth(event, year, monthIndex);
      if (occurrence && event.status !== "cancelled") generated.push({ id: `event-${event.id}`, title: event.title, date: occurrence, kind: eventLabels[event.eventType] ?? "Evento", scope: event.scope, note: event.recurrence === "none" ? "Evento manual" : `Recurrente: ${event.recurrence}`, amountCents: event.amountCents, currency: event.currency, source: "manual", event });
    });
    data.debts.filter(debt => debt.status !== "paid" && debt.nextDueAt && new Date(debt.nextDueAt).getFullYear() === year && new Date(debt.nextDueAt).getMonth() === monthIndex).forEach(debt => generated.push({ id: `debt-${debt.id}`, title: debt.name, date: new Date(debt.nextDueAt!), kind: "Vencimiento de deuda", scope: debt.scope, note: debt.creditor || "Obligación manual", amountCents: debt.minimumPaymentCents, currency: debt.currency, source: "deuda" }));
    data.documents.forEach(document => {
      const relevantDate = document.reminderAt ?? document.expiresAt;
      if (!relevantDate) return;
      const date = new Date(relevantDate);
      if (date.getFullYear() === year && date.getMonth() === monthIndex) generated.push({ id: `document-${document.id}`, title: document.name, date, kind: document.reminderAt ? "Recordatorio documental" : "Vencimiento documental", scope: document.scope, note: document.documentClass, source: "documento" });
    });
    data.tasks.filter(task => task.status !== "completed" && task.status !== "cancelled" && task.dueAt && new Date(task.dueAt).getFullYear() === year && new Date(task.dueAt).getMonth() === monthIndex).forEach(task => generated.push({ id: `task-${task.id}`, title: task.title, date: new Date(task.dueAt!), kind: "Tarea financiera", scope: task.scope, note: task.area, source: "tarea" }));
    const fiscalDate = data.profile?.futureTaxDueAt;
    if (fiscalDate && new Date(fiscalDate).getFullYear() === year && new Date(fiscalDate).getMonth() === monthIndex) generated.push({ id: "future-tax", title: "Reserva fiscal manual", date: new Date(fiscalDate), kind: "Fecha fiscal estimada", scope: "mixed", note: "Fecha introducida desde Calidad; no es calendario SAT automático.", amountCents: data.profile?.futureTaxReserveCents, currency, source: "fiscal" });
    return generated.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [currency, data, monthDate]);

  const changeStatus = (event: any, status: "completed" | "cancelled") => update.mutate({ ...event, startsAt: new Date(event.startsAt).getTime(), endsAt: event.endsAt ? new Date(event.endsAt).getTime() : null, amountCents: event.amountCents ?? null, linkedDebtId: event.linkedDebtId ?? null, linkedDocumentId: event.linkedDocumentId ?? null, linkedTaskId: event.linkedTaskId ?? null, notes: event.notes ?? null, status });

  if (isLoading || !data) return <div className="page-loading">Organizando el calendario financiero manual…</div>;
  return <div className="space-y-7">
    <header className="page-heading"><div><p className="eyebrow">Seguimiento manual</p><h1>Calendario financiero</h1><p>Reúne fechas que registras tú: obligaciones, documentos, revisiones e impuestos estimados. No consulta el SAT ni ejecuta pagos.</p></div><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button className="btn-primary" onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Añadir evento</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo evento financiero</DialogTitle><DialogDescription>Las recurrencias son recordatorios manuales; ninguna fecha se conecta con instituciones externas.</DialogDescription></DialogHeader><CalendarEventForm currency={currency} debts={data.debts} documents={data.documents} tasks={data.tasks} onDone={() => { setDialogOpen(false); utils.finance.dashboard.invalidate(); }} /></DialogContent></Dialog></header>
    <section className="content-card"><div className="calendar-toolbar"><div><p className="eyebrow">Periodo visible</p><h2 className="capitalize">{formatDate(monthDate, { month: "long", year: "numeric" })}</h2></div><Input aria-label="Mes del calendario" className="w-[170px]" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div><div className="calendar-summary"><span><CalendarDays className="size-4" /> {items.length} fechas visibles</span><span><ReceiptText className="size-4" /> Documentos y tareas incluidos</span><span><Landmark className="size-4" /> Deudas sin ejecución automática</span></div></section>
    <section className="calendar-timeline">{items.length === 0 ? <div className="content-card empty-state"><CalendarDays className="size-6" /><h2>Sin fechas para este mes</h2><p>Añade un pago manual, corte de tarjeta, vencimiento documental o revisión. Las fechas de deudas, tareas y documentos aparecerán aquí cuando existan.</p></div> : items.map(item => <article className={`calendar-event source-${item.source}`} key={item.id}><div className="calendar-date"><strong>{item.date.getDate()}</strong><span>{formatDate(item.date, { month: "short" })}</span></div><div className="calendar-event-body"><div className="calendar-event-head"><div><span className={`scope-pill scope-${item.scope}`}>{scopeLabel[item.scope]}</span><h2>{item.title}</h2><p>{item.kind} · {item.note}</p></div>{item.amountCents !== null && item.amountCents !== undefined ? <strong className="calendar-amount">{formatMoney(item.amountCents, item.currency || currency)}</strong> : null}</div>{item.source === "manual" ? <div className="calendar-actions"><Button type="button" variant="outline" size="sm" onClick={() => changeStatus(item.event, "completed")}><CheckCircle2 className="size-4" /> Completar</Button><Button type="button" variant="ghost" size="sm" onClick={() => changeStatus(item.event, "cancelled")}><XCircle className="size-4" /> Cancelar</Button><Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("¿Eliminar este evento manual?")) remove.mutate({ id: item.event.id }); }}>Eliminar</Button></div> : <div className="calendar-derived"><FileClock className="size-4" /> Fecha derivada de un registro manual existente.</div>}</div></article>)}</section>
  </div>;
}

function CalendarEventForm({ currency, debts, documents, tasks, onDone }: { currency: string; debts: any[]; documents: any[]; tasks: any[]; onDone: () => void }) {
  const save = trpc.finance.calendar.save.useMutation({ onSuccess: () => { toast.success("Evento agregado al calendario"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState({ title: "", eventType: "other", scope: "personal", date: new Date().toISOString().slice(0, 10), recurrence: "none", amount: "", linkedDebtId: "", linkedDocumentId: "", linkedTaskId: "", notes: "" });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate({ title: form.title, eventType: form.eventType as any, scope: form.scope as any, startsAt: new Date(`${form.date}T12:00:00`).getTime(), endsAt: null, recurrence: form.recurrence as any, amountCents: form.amount ? toCents(form.amount) : null, currency, linkedDebtId: form.linkedDebtId ? Number(form.linkedDebtId) : null, linkedDocumentId: form.linkedDocumentId ? Number(form.linkedDocumentId) : null, linkedTaskId: form.linkedTaskId ? Number(form.linkedTaskId) : null, status: "planned", notes: form.notes || null }); };
  return <form className="form-grid" onSubmit={submit}><div className="form-field span-2"><Label>Título</Label><Input required placeholder="Ej. Pago de tarjeta principal" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div><div className="form-field"><Label>Tipo</Label><select value={form.eventType} onChange={event => setForm({ ...form, eventType: event.target.value })}>{Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="form-field"><Label>Fecha</Label><Input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div><div className="form-field"><Label>Recurrencia</Label><select value={form.recurrence} onChange={event => setForm({ ...form, recurrence: event.target.value })}><option value="none">Una vez</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></select></div><div className="form-field"><Label>Importe estimado</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div><div className="form-field"><Label>Deuda vinculada</Label><select value={form.linkedDebtId} onChange={event => setForm({ ...form, linkedDebtId: event.target.value })}><option value="">Sin deuda</option>{debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></div><div className="form-field"><Label>Documento vinculado</Label><select value={form.linkedDocumentId} onChange={event => setForm({ ...form, linkedDocumentId: event.target.value })}><option value="">Sin documento</option>{documents.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select></div><div className="form-field"><Label>Tarea vinculada</Label><select value={form.linkedTaskId} onChange={event => setForm({ ...form, linkedTaskId: event.target.value })}><option value="">Sin tarea</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div><div className="form-field span-2"><Label>Notas</Label><Textarea placeholder="Referencia o condición para recordar" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="form-actions span-2"><Button type="submit" disabled={save.isPending}><CircleDollarSign className="size-4" /> {save.isPending ? "Guardando…" : "Guardar evento"}</Button></div></form>;
}
