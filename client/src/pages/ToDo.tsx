import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Archive, ArchiveRestore, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDot, Clock3, Filter, Flag, Link2, ListChecks, Plus, Search, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type TaskStatus = "pending" | "in_progress" | "waiting" | "completed" | "cancelled";
type TaskPriority = "critical" | "high" | "medium" | "low";

const statusLabel: Record<TaskStatus, string> = { pending: "Pendiente", in_progress: "En curso", waiting: "En espera", completed: "Completada", cancelled: "Cancelada" };
const priorityLabel: Record<TaskPriority, string> = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
const priorityWeight: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const areaLabel: Record<string, string> = { budget: "Presupuesto", debt: "Deudas", savings: "Ahorro", investment: "Inversiones", tax: "Fiscal", documents: "Documentos", business: "Negocio", review: "Revisión", other: "General" };
const resourceTypeLabel: Record<string, string> = { account: "Cuenta", credit_card: "Tarjeta", contact: "Contacto", investment: "Inversión", receivable: "CxC", payable: "CxP", fiscal_record: "PFAE", document: "Documento", travel: "Viaje", calendar_event: "Calendario", budget: "Presupuesto", category: "Categoría" };

function dayKey(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function isTaskClosed(task: any) {
  return task.status === "completed" || task.status === "cancelled" || Boolean(task.archivedAt);
}

function initialForm(task: any | null, links: Array<{ resourceType: string; resourceId: number }> = []) {
  return {
    id: task?.id as number | undefined,
    title: task?.title ?? "",
    entityId: task?.entityId ? String(task.entityId) : "none",
    projectId: task?.projectId ? String(task.projectId) : "none",
    milestoneId: task?.milestoneId ? String(task.milestoneId) : "none",
    goalId: task?.goalId ? String(task.goalId) : "none",
    debtId: task?.debtId ? String(task.debtId) : "none",
    linkedTransactionId: task?.linkedTransactionId ? String(task.linkedTransactionId) : "none",
    area: task?.area ?? "other",
    scope: task?.scope ?? "personal",
    priority: task?.priority ?? "medium",
    status: task?.status ?? "pending",
    dueAt: task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "",
    requiresConfirmation: task?.requiresConfirmation ?? false,
    notes: task?.notes ?? "",
    links,
  };
}

export default function ToDo() {
  const { data, isLoading } = trpc.finance.workspace.get.useQuery();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"inbox" | "today" | "upcoming" | "unscheduled" | "done" | "archived">("inbox");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [priority, setPriority] = useState("all");
  const [editorTask, setEditorTask] = useState<any | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refresh = async () => {
    await Promise.all([utils.finance.workspace.get.invalidate(), utils.finance.dashboard.invalidate()]);
  };
  const save = trpc.finance.tasks.save.useMutation({
    onSuccess: async () => {
      await refresh();
      setEditorOpen(false);
      setEditorTask(null);
      toast.success("Tarea guardada.");
    },
    onError: error => toast.error(error.message),
  });
  const archive = trpc.finance.tasks.archive.useMutation({
    onSuccess: async () => { await refresh(); toast.success("Estado de archivo actualizado."); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.finance.tasks.remove.useMutation({
    onSuccess: async () => { await refresh(); toast.success("Tarea eliminada."); },
    onError: error => toast.error(error.message),
  });

  const resourceOptions = useMemo(() => {
    if (!data) return [] as Array<{ key: string; resourceType: string; resourceId: number; label: string }>;
    const rows: Array<{ key: string; resourceType: string; resourceId: number; label: string }> = [];
    const add = (resourceType: string, rowsToAdd: any[], getLabel: (row: any) => string) => rowsToAdd.forEach(row => rows.push({ key: `${resourceType}:${row.id}`, resourceType, resourceId: row.id, label: `${resourceTypeLabel[resourceType]} · ${getLabel(row)}` }));
    add("account", data.accounts ?? [], row => row.name);
    add("credit_card", data.creditCards ?? [], row => row.name);
    add("contact", data.contacts ?? [], row => row.name);
    add("investment", data.investments ?? [], row => row.name);
    add("receivable", data.receivables ?? [], row => row.description ?? row.counterparty ?? `Cuenta por cobrar #${row.id}`);
    add("payable", data.payables ?? [], row => row.description ?? row.counterparty ?? `Cuenta por pagar #${row.id}`);
    add("fiscal_record", data.fiscalRecords ?? [], row => row.counterparty ?? row.description ?? `Registro PFAE #${row.id}`);
    add("document", data.documents ?? [], row => row.name);
    add("travel", data.travelPlans ?? [], row => row.name);
    add("calendar_event", data.calendarEvents ?? [], row => row.title);
    add("budget", data.budgets ?? [], row => row.name ?? `Presupuesto #${row.id}`);
    add("category", data.categories ?? [], row => row.name);
    return rows.sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [data]);
  const resourceByKey = useMemo(() => new Map(resourceOptions.map(item => [item.key, item])), [resourceOptions]);
  const taskLinksByTaskId = useMemo(() => {
    const map = new Map<number, Array<{ resourceType: string; resourceId: number }>>();
    (data?.taskLinks ?? []).forEach((link: any) => map.set(link.taskId, [...(map.get(link.taskId) ?? []), { resourceType: link.resourceType, resourceId: link.resourceId }]));
    return map;
  }, [data?.taskLinks]);

  const today = dayKey(new Date());
  const todayTime = new Date(); todayTime.setHours(0, 0, 0, 0);
  const nextWeek = new Date(todayTime); nextWeek.setDate(nextWeek.getDate() + 7);
  const visibleTasks = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const lowered = query.trim().toLocaleLowerCase("es-MX");
    return tasks.filter((task: any) => {
      const isArchived = Boolean(task.archivedAt);
      const closed = isTaskClosed(task);
      const due = task.dueAt ? new Date(task.dueAt) : null;
      const matchesTab = tab === "archived" ? isArchived : tab === "done" ? !isArchived && closed : tab === "today" ? !isArchived && !closed && dayKey(task.dueAt) === today : tab === "upcoming" ? !isArchived && !closed && due && due > todayTime && due <= nextWeek : tab === "unscheduled" ? !isArchived && !closed && !due : !isArchived && !closed;
      const matchesText = !lowered || `${task.title} ${task.notes ?? ""}`.toLocaleLowerCase("es-MX").includes(lowered);
      return matchesTab && matchesText && (area === "all" || task.area === area) && (priority === "all" || task.priority === priority);
    }).slice().sort((left: any, right: any) => {
      const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return priorityWeight[left.priority as TaskPriority] - priorityWeight[right.priority as TaskPriority] || leftDue - rightDue || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [area, data?.tasks, nextWeek, priority, query, tab, today, todayTime]);

  const overview = useMemo(() => {
    const tasks = data?.tasks ?? [];
    return {
      open: tasks.filter((task: any) => !isTaskClosed(task)).length,
      dueToday: tasks.filter((task: any) => !isTaskClosed(task) && dayKey(task.dueAt) === today).length,
      overdue: tasks.filter((task: any) => !isTaskClosed(task) && task.dueAt && new Date(task.dueAt) < todayTime).length,
      waiting: tasks.filter((task: any) => !isTaskClosed(task) && task.status === "waiting").length,
    };
  }, [data?.tasks, today, todayTime]);

  const openNew = () => { setEditorTask(null); setEditorOpen(true); };
  const openEdit = (task: any) => { setEditorTask(task); setEditorOpen(true); };
  const updateStatus = (task: any, status: TaskStatus) => {
    save.mutate(taskSaveInput(task, status, taskLinksByTaskId.get(task.id) ?? []));
  };

  if (isLoading || !data) return <section className="page-loading"><p>Preparando tu espacio ToDo…</p></section>;
  const isOwner = data.workspaceAccess.role === "owner";

  return <section className="space-y-5 pb-8">
    <header className="flex flex-col gap-5 border-b border-border/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="eyebrow">Resumen operativo</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em]">ToDo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Un solo lugar para decidir qué sigue, con enlaces trazables a tus finanzas, proyectos y compromisos.</p></div>
      {isOwner ? <Button className="btn-primary" onClick={openNew}><Plus className="mr-1.5 size-4" />Nueva tarea</Button> : null}
    </header>

    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumen de tareas">
      <TaskMetric icon={ListChecks} label="Abiertas" value={overview.open} tone="text-primary" />
      <TaskMetric icon={CalendarDays} label="Hoy" value={overview.dueToday} tone="text-amber-700" />
      <TaskMetric icon={Flag} label="Vencidas" value={overview.overdue} tone={overview.overdue ? "text-rose-700" : "text-emerald-700"} />
      <TaskMetric icon={Clock3} label="En espera" value={overview.waiting} tone="text-violet-700" />
    </section>

    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/20 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 gap-1 overflow-x-auto pb-3 [scrollbar-width:none]" aria-label="Vistas de ToDo">
          {([ ["inbox", "Bandeja"], ["today", "Hoy"], ["upcoming", "Próximas"], ["unscheduled", "Sin fecha"], ["done", "Completadas"], ["archived", "Archivadas"] ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-[0.97] ${tab === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{label}</button>)}
        </div>
        <div className="grid gap-2 border-t py-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} className="pl-9" placeholder="Buscar tareas, notas o compromisos…" /></label>
          <Select value={area} onValueChange={setArea}><SelectTrigger><Filter className="mr-1.5 size-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las áreas</SelectItem>{Object.entries(areaLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><Flag className="mr-1.5 size-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda prioridad</SelectItem>{Object.entries(priorityLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {visibleTasks.length ? <div className="divide-y">{visibleTasks.map((task: any) => <TaskRow key={task.id} task={task} resourceByKey={resourceByKey} links={taskLinksByTaskId.get(task.id) ?? []} entities={data.entities} projects={data.projects} goals={data.goals} debts={data.debts} transactions={data.transactions} calendarEvents={data.calendarEvents ?? []} travelItems={data.travelItems ?? []} isOwner={isOwner} isSaving={save.isPending} onComplete={() => updateStatus(task, task.status === "completed" ? "pending" : "completed")} onEdit={() => openEdit(task)} onArchive={() => archive.mutate({ id: task.id, archived: !task.archivedAt })} onRemove={() => { if (window.confirm(`¿Eliminar «${task.title}»? Esta acción no se puede deshacer.`)) remove.mutate({ id: task.id }); }} />)}</div> : <div className="px-5 py-14 text-center"><CircleDot className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 text-base font-semibold">No hay tareas para esta vista</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">Cambia los filtros o crea una tarea para centralizar el siguiente paso de tus finanzas.</p>{isOwner ? <Button className="mt-4" variant="outline" onClick={openNew}><Plus className="mr-1.5 size-4" />Crear tarea</Button> : null}</div>}
    </section>

    <Dialog open={editorOpen} onOpenChange={value => { setEditorOpen(value); if (!value) setEditorTask(null); }}>
      <TaskEditor task={editorTask} snapshot={data} resourceOptions={resourceOptions} initialLinks={taskLinksByTaskId.get(editorTask?.id) ?? []} saving={save.isPending} onCancel={() => { setEditorOpen(false); setEditorTask(null); }} onSubmit={(input: any) => save.mutate(input)} />
    </Dialog>
  </section>;
}

function TaskMetric({ icon: Icon, label, value, tone }: { icon: typeof ListChecks; label: string; value: number; tone: string }) {
  return <article className="rounded-xl border bg-card px-3 py-3 shadow-sm"><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</span><Icon className={`size-4 ${tone}`} /></div><strong className={`mt-1.5 block text-2xl font-semibold tracking-[-0.05em] ${tone}`}>{value}</strong></article>;
}

function TaskRow({ task, resourceByKey, links, entities, projects, goals, debts, transactions, calendarEvents, travelItems, isOwner, isSaving, onComplete, onEdit, onArchive, onRemove }: any) {
  const relationships = taskRelationships(task, { resourceByKey, links, entities, projects, goals, debts, transactions, calendarEvents, travelItems });
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const isOverdue = due && due < now && !isTaskClosed(task);
  const complete = task.status === "completed";
  return <article className="flex gap-3 px-4 py-4 sm:px-5">
    <Checkbox checked={complete} disabled={!isOwner || isSaving} aria-label={`${complete ? "Reabrir" : "Completar"} tarea ${task.title}`} onCheckedChange={() => onComplete()} className="mt-0.5 size-5" />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start gap-x-2 gap-y-1"><h2 className={`min-w-0 flex-1 text-sm font-semibold ${complete ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</h2><PriorityBadge priority={task.priority} /></div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>{areaLabel[task.area]}</span><span aria-hidden="true">·</span><span className={isOverdue ? "font-semibold text-rose-700" : ""}>{task.dueAt ? (isOverdue ? `Venció ${formatDate(task.dueAt)}` : formatDate(task.dueAt)) : "Sin fecha"}</span>{task.requiresConfirmation ? <><span aria-hidden="true">·</span><span className="font-medium text-amber-700">Requiere confirmación</span></> : null}</div>
      {task.notes ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{task.notes}</p> : null}
      {relationships.length ? <div className="mt-2.5 flex flex-wrap gap-1.5">{relationships.slice(0, 6).map((relationship: any) => <Badge key={relationship.key} variant="secondary" className="max-w-full gap-1 truncate bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"><Link2 className="size-3 shrink-0" /><span className="truncate">{relationship.label}</span></Badge>)}{relationships.length > 6 ? <Badge variant="secondary" className="px-2 py-1 text-[10px]">+{relationships.length - 6}</Badge> : null}</div> : null}
    </div>
    {isOwner ? <div className="flex shrink-0 items-start gap-1"><Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${task.title}`} onClick={onEdit}><ChevronRight className="size-4" /></Button><Button size="icon" variant="ghost" className="size-8" aria-label={task.archivedAt ? "Recuperar tarea" : "Archivar tarea"} onClick={onArchive}>{task.archivedAt ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}</Button><Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-700" aria-label={`Eliminar ${task.title}`} onClick={onRemove}><Trash2 className="size-4" /></Button></div> : null}
  </article>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone = priority === "critical" ? "bg-rose-100 text-rose-800" : priority === "high" ? "bg-amber-100 text-amber-800" : priority === "medium" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>{priorityLabel[priority]}</span>;
}

function taskRelationships(task: any, context: any) {
  const result: Array<{ key: string; label: string }> = [];
  const add = (key: string, prefix: string, row: any, label = row?.name ?? row?.title ?? row?.notes ?? null) => { if (row) result.push({ key, label: `${prefix} · ${label || `#${row.id}`}` }); };
  add(`entity:${task.entityId}`, "Entidad", context.entities.find((row: any) => row.id === task.entityId));
  add(`project:${task.projectId}`, "Proyecto", context.projects.find((row: any) => row.id === task.projectId));
  add(`goal:${task.goalId}`, "Objetivo", context.goals.find((row: any) => row.id === task.goalId));
  add(`debt:${task.debtId}`, "Deuda", context.debts.find((row: any) => row.id === task.debtId));
  add(`transaction:${task.linkedTransactionId}`, "Movimiento", context.transactions.find((row: any) => row.id === task.linkedTransactionId), context.transactions.find((row: any) => row.id === task.linkedTransactionId)?.notes || "Movimiento registrado");
  context.links.forEach((link: any) => { const resource = context.resourceByKey.get(`${link.resourceType}:${link.resourceId}`); if (resource) result.push({ key: `link:${link.resourceType}:${link.resourceId}`, label: resource.label }); });
  context.calendarEvents.filter((event: any) => event.linkedTaskId === task.id).forEach((event: any) => result.push({ key: `calendar:${event.id}`, label: `Calendario · ${event.title}` }));
  context.travelItems.filter((item: any) => item.taskId === task.id).forEach((item: any) => result.push({ key: `travel-item:${item.id}`, label: `Itinerario · ${item.title}` }));
  return result;
}

function taskSaveInput(task: any, status: TaskStatus, links: Array<{ resourceType: string; resourceId: number }>) {
  return { id: task.id, entityId: task.entityId, projectId: task.projectId, milestoneId: task.milestoneId, linkedTransactionId: task.linkedTransactionId, title: task.title, area: task.area, scope: task.scope, priority: task.priority, status, dueAt: task.dueAt ? new Date(task.dueAt).getTime() : null, goalId: task.goalId, debtId: task.debtId, requiresConfirmation: task.requiresConfirmation, notes: task.notes, links: links as any };
}

function TaskEditor({ task, snapshot, resourceOptions, initialLinks, saving, onCancel, onSubmit }: any) {
  const [form, setForm] = useState(() => initialForm(task, initialLinks));
  const [resourceSelection, setResourceSelection] = useState("choose");
  const isEditing = Boolean(task);
  const selectedProjectId = form.projectId === "none" ? null : Number(form.projectId);
  const milestones = selectedProjectId ? (snapshot.projectMilestones ?? []).filter((milestone: any) => milestone.projectId === selectedProjectId && milestone.status !== "archived") : [];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ id: form.id, entityId: form.entityId === "none" ? null : Number(form.entityId), projectId: form.projectId === "none" ? null : Number(form.projectId), milestoneId: form.milestoneId === "none" ? null : Number(form.milestoneId), linkedTransactionId: form.linkedTransactionId === "none" ? null : Number(form.linkedTransactionId), title: form.title.trim(), area: form.area, scope: form.scope, priority: form.priority, status: form.status, dueAt: form.dueAt ? new Date(`${form.dueAt}T12:00:00`).getTime() : null, goalId: form.goalId === "none" ? null : Number(form.goalId), debtId: form.debtId === "none" ? null : Number(form.debtId), requiresConfirmation: form.requiresConfirmation, notes: form.notes.trim() || null, links: form.links });
  };
  const addResource = (key: string) => {
    const resource = resourceOptions.find((item: any) => item.key === key);
    if (resource && !form.links.some((link: any) => link.resourceType === resource.resourceType && link.resourceId === resource.resourceId)) setForm((current: any) => ({ ...current, links: [...current.links, { resourceType: resource.resourceType, resourceId: resource.resourceId }] }));
    setResourceSelection("choose");
  };
  return <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><p className="eyebrow">ToDo</p><DialogTitle>{isEditing ? "Editar tarea" : "Nueva tarea"}</DialogTitle><DialogDescription>La tarea organiza tu siguiente acción; los vínculos conservan cada dato en su módulo de origen.</DialogDescription></DialogHeader><form className="grid gap-4 py-2" onSubmit={submit}>
    <div className="grid gap-2"><Label htmlFor="todo-title">Tarea</Label><Input id="todo-title" required maxLength={180} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ej. Conciliar estado de cuenta de Santander" /></div>
    <div className="grid gap-4 sm:grid-cols-3"><FieldSelect label="Prioridad" value={form.priority} onChange={(value: string) => setForm({ ...form, priority: value })} options={Object.entries(priorityLabel)} /><FieldSelect label="Estado" value={form.status} onChange={(value: string) => setForm({ ...form, status: value })} options={Object.entries(statusLabel)} /><FieldSelect label="Área" value={form.area} onChange={(value: string) => setForm({ ...form, area: value })} options={Object.entries(areaLabel)} /></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="todo-due">Fecha</Label><Input id="todo-due" type="date" value={form.dueAt} onChange={event => setForm({ ...form, dueAt: event.target.value })} /></div><FieldSelect label="Ámbito" value={form.scope} onChange={(value: string) => setForm({ ...form, scope: value })} options={[["personal", "Personal"], ["business", "Negocio"], ["mixed", "Mixto"]]} /><label className="flex items-center gap-2 self-end rounded-lg border px-3 py-2.5 text-sm"><Checkbox checked={form.requiresConfirmation} onCheckedChange={value => setForm({ ...form, requiresConfirmation: Boolean(value) })} />Requiere confirmación</label></div>
    <section className="rounded-xl border bg-muted/20 p-3.5"><p className="text-xs font-semibold">Relación principal</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Asocia proyecto, entidad u objetivo para que la tarea aparezca también en su contexto.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><LookupSelect label="Entidad" value={form.entityId} onChange={(value: string) => setForm({ ...form, entityId: value })} options={(snapshot.entities ?? []).map((row: any) => [String(row.id), row.name])} /><LookupSelect label="Proyecto" value={form.projectId} onChange={(value: string) => setForm({ ...form, projectId: value, milestoneId: "none" })} options={(snapshot.projects ?? []).map((row: any) => [String(row.id), row.name])} /><LookupSelect label="Parte del proyecto" value={form.milestoneId} onChange={(value: string) => setForm({ ...form, milestoneId: value })} options={milestones.map((row: any) => [String(row.id), row.title])} /><LookupSelect label="Objetivo" value={form.goalId} onChange={(value: string) => setForm({ ...form, goalId: value })} options={(snapshot.goals ?? []).map((row: any) => [String(row.id), row.name])} /><LookupSelect label="Deuda" value={form.debtId} onChange={(value: string) => setForm({ ...form, debtId: value })} options={(snapshot.debts ?? []).map((row: any) => [String(row.id), row.name])} /><LookupSelect label="Movimiento" value={form.linkedTransactionId} onChange={(value: string) => setForm({ ...form, linkedTransactionId: value })} options={(snapshot.transactions ?? []).slice(0, 100).map((row: any) => [String(row.id), `${formatDate(row.occurredAt)} · ${row.notes || `Movimiento #${row.id}`}`])} /></div></section>
    <section className="rounded-xl border bg-muted/20 p-3.5"><div><p className="flex items-center gap-2 text-xs font-semibold"><Link2 className="size-3.5" />Más enlaces</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Puedes vincular cuentas, tarjetas, contactos, inversiones, CxC/CxP, PFAE, documentos, viajes, calendario, presupuesto o categorías.</p></div><Select value={resourceSelection} onValueChange={addResource}><SelectTrigger className="mt-3"><SelectValue placeholder="Añadir referencia" /></SelectTrigger><SelectContent><SelectItem value="choose">Añadir referencia…</SelectItem>{resourceOptions.map((resource: any) => <SelectItem key={resource.key} value={resource.key}>{resource.label}</SelectItem>)}</SelectContent></Select>{form.links.length ? <div className="mt-3 flex flex-wrap gap-1.5">{form.links.map((link: any) => { const resource = resourceOptions.find((item: any) => item.resourceType === link.resourceType && item.resourceId === link.resourceId); return <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1" key={`${link.resourceType}:${link.resourceId}`}><span className="max-w-52 truncate">{resource?.label ?? `${resourceTypeLabel[link.resourceType]} · #${link.resourceId}`}</span><button type="button" aria-label="Quitar enlace" className="grid size-4 place-items-center rounded-full hover:bg-muted-foreground/20" onClick={() => setForm((current: any) => ({ ...current, links: current.links.filter((item: any) => item.resourceType !== link.resourceType || item.resourceId !== link.resourceId) }))}><X className="size-3" /></button></Badge>; })}</div> : null}</section>
    <div className="grid gap-2"><Label htmlFor="todo-notes">Notas</Label><Textarea id="todo-notes" value={form.notes} maxLength={3000} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Contexto, criterio de cierre o siguiente decisión…" /></div>
    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar tarea"}</Button></div>
  </form></DialogContent>;
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <div className="grid gap-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map(([itemValue, itemLabel]) => <SelectItem key={itemValue} value={itemValue}>{itemLabel}</SelectItem>)}</SelectContent></Select></div>;
}

function LookupSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <div className="grid gap-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin vincular</SelectItem>{options.map(([itemValue, itemLabel]) => <SelectItem key={itemValue} value={itemValue}>{itemLabel}</SelectItem>)}</SelectContent></Select></div>;
}
