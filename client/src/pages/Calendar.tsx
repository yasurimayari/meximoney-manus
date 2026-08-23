import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney, scopeLabel, toCents } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CircleDollarSign, FileClock, Landmark, Plus, ReceiptText, RotateCcw, XCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type CalendarView = "month" | "week";
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
const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function atStartOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, days: number) { const result = new Date(value); result.setDate(result.getDate() + days); return atStartOfDay(result); }
function addMonths(value: Date, months: number) { return new Date(value.getFullYear(), value.getMonth() + months, 1); }
function isSameDay(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function isInRange(value: Date, start: Date, endExclusive: Date) { return value >= start && value < endExclusive; }
function startOfWeek(value: Date) { const day = value.getDay() || 7; return addDays(value, -(day - 1)); }
function monthValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`; }
function capitalized(value: string) { return value ? value[0].toUpperCase() + value.slice(1) : value; }

function eventOccursInMonth(event: any, year: number, month: number) {
  const base = new Date(event.startsAt);
  if (base.getTime() > new Date(year, month + 1, 0, 23, 59, 59).getTime()) return null;
  if (event.recurrence === "none") return base.getFullYear() === year && base.getMonth() === month ? atStartOfDay(base) : null;
  if (event.recurrence === "monthly") return new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate()));
  if (event.recurrence === "quarterly") {
    const offset = (year - base.getFullYear()) * 12 + month - base.getMonth();
    return offset >= 0 && offset % 3 === 0 ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
  }
  return base.getMonth() === month ? new Date(year, month, Math.min(base.getDate(), new Date(year, month + 1, 0).getDate())) : null;
}

function buildCalendarItems(data: any, start: Date, endExclusive: Date, currency: string) {
  const generated: CalendarItem[] = [];
  const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  for (let cursor = firstMonth; cursor < endExclusive; cursor = addMonths(cursor, 1)) {
    data.calendarEvents.forEach((event: any) => {
      const occurrence = eventOccursInMonth(event, cursor.getFullYear(), cursor.getMonth());
      if (occurrence && event.status !== "cancelled" && isInRange(occurrence, start, endExclusive)) generated.push({ id: `event-${event.id}-${monthValue(cursor)}`, title: event.title, date: occurrence, kind: eventLabels[event.eventType] ?? "Evento", scope: event.scope, note: event.recurrence === "none" ? "Evento manual" : `Recurrente: ${event.recurrence}`, amountCents: event.amountCents, currency: event.currency, source: "manual", event });
    });
  }
  data.debts.forEach((debt: any) => {
    if (debt.status === "paid" || !debt.nextDueAt) return;
    const date = atStartOfDay(new Date(debt.nextDueAt));
    if (isInRange(date, start, endExclusive)) generated.push({ id: `debt-${debt.id}`, title: debt.name, date, kind: "Vencimiento de deuda", scope: debt.scope, note: debt.creditor || "Obligación manual", amountCents: debt.minimumPaymentCents, currency: debt.currency, source: "deuda" });
  });
  data.documents.forEach((document: any) => {
    const relevantDate = document.reminderAt ?? document.expiresAt;
    if (!relevantDate) return;
    const date = atStartOfDay(new Date(relevantDate));
    if (isInRange(date, start, endExclusive)) generated.push({ id: `document-${document.id}`, title: document.name, date, kind: document.reminderAt ? "Recordatorio documental" : "Vencimiento documental", scope: document.scope, note: document.documentClass, source: "documento" });
  });
  data.tasks.forEach((task: any) => {
    if (task.status === "completed" || task.status === "cancelled" || !task.dueAt) return;
    const date = atStartOfDay(new Date(task.dueAt));
    if (isInRange(date, start, endExclusive)) generated.push({ id: `task-${task.id}`, title: task.title, date, kind: "Tarea financiera", scope: task.scope, note: task.area, source: "tarea" });
  });
  const fiscalDate = data.profile?.futureTaxDueAt;
  if (fiscalDate) {
    const date = atStartOfDay(new Date(fiscalDate));
    if (isInRange(date, start, endExclusive)) generated.push({ id: "future-tax", title: "Reserva fiscal manual", date, kind: "Fecha fiscal estimada", scope: "mixed", note: "Fecha introducida desde Calidad; no es calendario SAT automático.", amountCents: data.profile?.futureTaxReserveCents, currency, source: "fiscal" });
  }
  return generated.sort((left, right) => left.date.getTime() - right.date.getTime() || left.title.localeCompare(right.title));
}

export default function Calendar() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.dashboard.useQuery();
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(() => atStartOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => atStartOfDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const currency = data?.profile?.currency ?? "MXN";
  const remove = trpc.finance.calendar.remove.useMutation({ onSuccess: () => utils.finance.dashboard.invalidate(), onError: error => toast.error(error.message) });
  const update = trpc.finance.calendar.save.useMutation({ onSuccess: () => { toast.success("Evento actualizado"); utils.finance.dashboard.invalidate(); }, onError: error => toast.error(error.message) });

  const period = useMemo(() => {
    if (view === "week") { const start = startOfWeek(anchorDate); return { start, end: addDays(start, 7), label: `${formatDate(start, { day: "numeric", month: "short" })} – ${formatDate(addDays(start, 6), { day: "numeric", month: "short", year: "numeric" })}` }; }
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const leading = (first.getDay() + 6) % 7;
    const start = addDays(first, -leading);
    return { start, end: addDays(start, 42), label: capitalized(formatDate(first, { month: "long", year: "numeric" })) };
  }, [anchorDate, view]);
  const days = useMemo(() => Array.from({ length: view === "week" ? 7 : 42 }, (_, index) => addDays(period.start, index)), [period.start, view]);
  const items = useMemo(() => data ? buildCalendarItems(data, period.start, period.end, currency) : [], [currency, data, period.end, period.start]);
  const agendaItems = useMemo(() => items.filter(item => isSameDay(item.date, selectedDate)), [items, selectedDate]);
  const isCurrentMonth = (date: Date) => date.getMonth() === anchorDate.getMonth() && date.getFullYear() === anchorDate.getFullYear();
  const movePeriod = (direction: -1 | 1) => setAnchorDate(current => view === "month" ? addMonths(current, direction) : addDays(current, direction * 7));
  const goToday = () => { const today = atStartOfDay(new Date()); setAnchorDate(today); setSelectedDate(today); };
  const changeStatus = (event: any, status: "completed" | "cancelled") => update.mutate({ ...event, startsAt: new Date(event.startsAt).getTime(), endsAt: event.endsAt ? new Date(event.endsAt).getTime() : null, amountCents: event.amountCents ?? null, linkedDebtId: event.linkedDebtId ?? null, linkedDocumentId: event.linkedDocumentId ?? null, linkedTaskId: event.linkedTaskId ?? null, notes: event.notes ?? null, status });

  if (isLoading || !data) return <div className="page-loading">Organizando el calendario financiero manual…</div>;
  return <div className="space-y-7">
    <header className="page-heading"><div><p className="eyebrow">Seguimiento manual</p><h1>Calendario financiero</h1><p>Visualiza pagos, vencimientos y revisiones que registras tú. No consulta el SAT, no sincroniza bancos ni ejecuta pagos.</p></div><Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button className="btn-primary" onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Añadir evento</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo evento financiero</DialogTitle><DialogDescription>Las recurrencias son recordatorios manuales; ninguna fecha se conecta con instituciones externas.</DialogDescription></DialogHeader><CalendarEventForm currency={currency} debts={data.debts} documents={data.documents} tasks={data.tasks} onDone={() => { setDialogOpen(false); utils.finance.dashboard.invalidate(); }} /></DialogContent></Dialog></header>
    <section className="content-card calendar-view-shell"><div className="calendar-view-toolbar"><div className="calendar-view-toggle" role="group" aria-label="Vista de calendario"><Button type="button" size="sm" aria-pressed={view === "month"} variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>Mensual</Button><Button type="button" size="sm" aria-pressed={view === "week"} variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")}>Semanal</Button></div><div className="calendar-period-nav"><Button type="button" variant="outline" size="icon" aria-label={view === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => movePeriod(-1)}><ArrowLeft className="size-4" /></Button><Button type="button" variant="ghost" size="sm" onClick={goToday}><RotateCcw className="size-3.5" /> Hoy</Button><Button type="button" variant="outline" size="icon" aria-label={view === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => movePeriod(1)}><ArrowRight className="size-4" /></Button></div></div><div className="calendar-period-heading"><div><p className="eyebrow">{view === "month" ? "Vista mensual" : "Vista semanal"}</p><h2>{period.label}</h2></div>{view === "month" ? <Input aria-label="Mes del calendario" className="w-[170px]" type="month" value={monthValue(anchorDate)} onChange={event => { const [year, month] = event.target.value.split("-").map(Number); if (year && month) setAnchorDate(new Date(year, month - 1, 1)); }} /> : <Input aria-label="Fecha de la semana" className="w-[170px]" type="date" value={anchorDate.toISOString().slice(0, 10)} onChange={event => event.target.value && setAnchorDate(atStartOfDay(new Date(`${event.target.value}T12:00:00`)))} />}</div><div className="calendar-summary"><span><CalendarDays className="size-4" /> {items.length} fechas en la vista</span><span><ReceiptText className="size-4" /> Documentos y tareas incluidos</span><span><Landmark className="size-4" /> Deudas sin ejecución automática</span></div></section>
    <section className={`calendar-board calendar-board-${view}`} aria-label={`Vista ${view === "month" ? "mensual" : "semanal"} del calendario`}><div className="calendar-weekday-row">{weekdayLabels.map(label => <span key={label}>{label}</span>)}</div><div className="calendar-grid">{days.map(day => { const dayItems = items.filter(item => isSameDay(item.date, day)); const today = isSameDay(day, new Date()); const selected = isSameDay(day, selectedDate); return <button type="button" className={`calendar-day ${isCurrentMonth(day) || view === "week" ? "" : "calendar-day-muted"} ${today ? "calendar-day-today" : ""} ${selected ? "calendar-day-selected" : ""}`} aria-pressed={selected} aria-label={`${formatDate(day, { weekday: "long", day: "numeric", month: "long" })}, ${dayItems.length} eventos`} key={day.toISOString()} onClick={() => setSelectedDate(day)}><span className="calendar-day-number">{day.getDate()}</span><div className="calendar-day-events">{dayItems.slice(0, view === "week" ? 3 : 2).map(item => <span className={`calendar-day-event source-${item.source}`} key={item.id}>{item.title}</span>)}{dayItems.length > (view === "week" ? 3 : 2) ? <span className="calendar-day-more">+{dayItems.length - (view === "week" ? 3 : 2)} más</span> : null}</div></button>; })}</div></section>
    <section className="calendar-agenda"><div className="section-heading"><div><p className="eyebrow">Detalle del día</p><h2>{capitalized(formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</h2></div><span className="period-chip">{agendaItems.length} {agendaItems.length === 1 ? "fecha" : "fechas"}</span></div>{agendaItems.length === 0 ? <div className="content-card empty-state calendar-agenda-empty"><CalendarDays className="size-6" /><div><h3>Sin fechas para este día</h3><p>Elige otro día o añade un pago, corte, vencimiento documental o revisión manual.</p></div></div> : <div className="calendar-timeline">{agendaItems.map(item => <article className={`calendar-event source-${item.source}`} key={item.id}><div className="calendar-date"><strong>{item.date.getDate()}</strong><span>{formatDate(item.date, { month: "short" })}</span></div><div className="calendar-event-body"><div className="calendar-event-head"><div><span className={`scope-pill scope-${item.scope}`}>{scopeLabel[item.scope]}</span><h2>{item.title}</h2><p>{item.kind} · {item.note}</p></div>{item.amountCents !== null && item.amountCents !== undefined ? <strong className="calendar-amount">{formatMoney(item.amountCents, item.currency || currency)}</strong> : null}</div>{item.source === "manual" ? <div className="calendar-actions"><Button type="button" variant="outline" size="sm" onClick={() => changeStatus(item.event, "completed")}><CheckCircle2 className="size-4" /> Completar</Button><Button type="button" variant="ghost" size="sm" onClick={() => changeStatus(item.event, "cancelled")}><XCircle className="size-4" /> Cancelar</Button><Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("¿Eliminar este evento manual?")) remove.mutate({ id: item.event.id }); }}>Eliminar</Button></div> : <div className="calendar-derived"><FileClock className="size-4" /> Fecha derivada de un registro manual existente.</div>}</div></article>)}</div>}</section>
  </div>;
}

function CalendarEventForm({ currency, debts, documents, tasks, onDone }: { currency: string; debts: any[]; documents: any[]; tasks: any[]; onDone: () => void }) {
  const save = trpc.finance.calendar.save.useMutation({ onSuccess: () => { toast.success("Evento agregado al calendario"); onDone(); }, onError: error => toast.error(error.message) });
  const [form, setForm] = useState({ title: "", eventType: "other", scope: "personal", date: new Date().toISOString().slice(0, 10), recurrence: "none", amount: "", linkedDebtId: "", linkedDocumentId: "", linkedTaskId: "", notes: "" });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate({ title: form.title, eventType: form.eventType as any, scope: form.scope as any, startsAt: new Date(`${form.date}T12:00:00`).getTime(), endsAt: null, recurrence: form.recurrence as any, amountCents: form.amount ? toCents(form.amount) : null, currency, linkedDebtId: form.linkedDebtId ? Number(form.linkedDebtId) : null, linkedDocumentId: form.linkedDocumentId ? Number(form.linkedDocumentId) : null, linkedTaskId: form.linkedTaskId ? Number(form.linkedTaskId) : null, status: "planned", notes: form.notes || null }); };
  return <form className="form-grid" onSubmit={submit}><div className="form-field span-2"><Label>Título</Label><Input required placeholder="Ej. Pago de tarjeta principal" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div><div className="form-field"><Label>Tipo</Label><select value={form.eventType} onChange={event => setForm({ ...form, eventType: event.target.value })}>{Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-field"><Label>Área</Label><select value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></div><div className="form-field"><Label>Fecha</Label><Input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></div><div className="form-field"><Label>Recurrencia</Label><select value={form.recurrence} onChange={event => setForm({ ...form, recurrence: event.target.value })}><option value="none">Una vez</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></select></div><div className="form-field"><Label>Importe estimado</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></div><div className="form-field"><Label>Deuda vinculada</Label><select value={form.linkedDebtId} onChange={event => setForm({ ...form, linkedDebtId: event.target.value })}><option value="">Sin deuda</option>{debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></div><div className="form-field"><Label>Documento vinculado</Label><select value={form.linkedDocumentId} onChange={event => setForm({ ...form, linkedDocumentId: event.target.value })}><option value="">Sin documento</option>{documents.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select></div><div className="form-field"><Label>Tarea vinculada</Label><select value={form.linkedTaskId} onChange={event => setForm({ ...form, linkedTaskId: event.target.value })}><option value="">Sin tarea</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div><div className="form-field span-2"><Label>Notas</Label><Textarea placeholder="Referencia o condición para recordar" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="form-actions span-2"><Button type="submit" disabled={save.isPending}><CircleDollarSign className="size-4" /> {save.isPending ? "Guardando…" : "Guardar evento"}</Button></div></form>;
}
