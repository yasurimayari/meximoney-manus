import { Archive, CalendarCheck2, CheckCircle2, HeartPulse, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { habitMetrics } from "@/lib/habitMetrics";
import { trpc } from "@/lib/trpc";

const cadenceLabel = { daily: "Diario", weekly: "Semanal", monthly: "Mensual" } as const;
const colorClass = {
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
} as const;
const suggestions = ["Registrar movimientos de la semana", "Conciliar una cuenta", "Revisar pagos próximos", "Actualizar inversión", "Revisar presupuesto", "Cerrar el mes"];

type Habit = {
  id: number;
  title: string;
  cadence: keyof typeof cadenceLabel;
  color: keyof typeof colorClass;
  isActive: boolean;
  archivedAt: Date | string | null;
  lastCheckinAt: Date | string | null;
  weeklyCheckins: number;
  monthlyCheckins: number;
  checkins: Array<{ id: number; completedAt: Date | string; note: string | null }>;
};

export default function Habits() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.habits.overview.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const savePreferences = trpc.finance.habits.savePreferences.useMutation({ onSuccess: () => utils.finance.habits.overview.invalidate(), onError: error => toast.error(error.message) });
  const saveHabit = trpc.finance.habits.saveHabit.useMutation({ onSuccess: async () => { await utils.finance.habits.overview.invalidate(); setDialogOpen(false); setEditing(null); toast.success("Hábito guardado."); }, onError: error => toast.error(error.message) });
  const checkIn = trpc.finance.habits.checkIn.useMutation({ onSuccess: async () => { await utils.finance.habits.overview.invalidate(); toast.success("Registro de hábito guardado."); }, onError: error => toast.error(error.message) });
  const archive = trpc.finance.habits.archiveHabit.useMutation({ onSuccess: () => utils.finance.habits.overview.invalidate(), onError: error => toast.error(error.message) });
  const remove = trpc.finance.habits.removeHabit.useMutation({ onSuccess: () => utils.finance.habits.overview.invalidate(), onError: error => toast.error(error.message) });

  const habits = (data?.habits ?? []) as Habit[];
  const activeHabits = habits.filter(habit => habit.isActive);
  const archivedHabits = habits.filter(habit => !habit.isActive);
  const metrics = useMemo(() => habitMetrics(habits), [habits]);
  if (isLoading || !data) return <div className="page-loading">Preparando tus hábitos voluntarios…</div>;

  const setEnabled = (enabled: boolean) => savePreferences.mutate({ enabled, showOnDashboard: data.preferences.showOnDashboard });
  const setDashboard = (showOnDashboard: boolean) => savePreferences.mutate({ enabled: data.preferences.enabled, showOnDashboard });
  return <section className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Seguimiento voluntario</p><h1 className="page-title">Hábitos financieros</h1><p className="page-subtitle">Marca acciones que tú elijas. No modifica tu Score, no infiere conductas y no activa avisos sin tu permiso.</p></div>
      <Button className="btn-primary" disabled={!data.preferences.enabled} onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 size-4" />Nuevo hábito</Button>
    </header>

    <Card className="surface-card"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><HeartPulse className="size-5" /></div><div><p className="font-semibold">Seguimiento bajo tu control</p><p className="mt-1 text-sm text-muted-foreground">Al activarlo, podrás crear y registrar hábitos manualmente. Puedes desactivarlo cuando quieras.</p></div></div><div className="flex items-center gap-3"><Label htmlFor="habits-enabled" className="text-sm font-medium">{data.preferences.enabled ? "Activo" : "Inactivo"}</Label><Switch id="habits-enabled" checked={data.preferences.enabled} onCheckedChange={setEnabled} disabled={savePreferences.isPending} /></div></CardContent></Card>

    {data.preferences.enabled ? <>
      <section className="grid gap-4 sm:grid-cols-3"><Metric label="Hábitos activos" value={metrics.activeCount} note="Sólo los que no están archivados" /><Metric label="Completados esta semana" value={metrics.completedThisWeek} note="Al menos un registro en 7 días" /><Metric label="Cobertura semanal" value={metrics.completionRate === null ? "—" : `${metrics.completionRate}%`} note="No es una evaluación ni calificación" /></section>
      <Card className="surface-card"><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Preferencias</CardTitle><CardDescription>Estas opciones no afectan tu Score personal ni el crediticio.</CardDescription></div><div className="flex items-center gap-2"><Label htmlFor="habits-dashboard" className="text-sm">Mostrar en Panel</Label><Switch id="habits-dashboard" checked={data.preferences.showOnDashboard} onCheckedChange={setDashboard} disabled={savePreferences.isPending} /></div></CardHeader></Card>
      {activeHabits.length ? <section className="grid gap-4 lg:grid-cols-2">{activeHabits.map(habit => <HabitCard key={habit.id} habit={habit} checking={checkIn.isPending} onCheck={() => checkIn.mutate({ habitId: habit.id })} onEdit={() => { setEditing(habit); setDialogOpen(true); }} onArchive={() => archive.mutate({ id: habit.id, archived: true })} onDelete={() => { if (window.confirm(`¿Eliminar «${habit.title}» y su historial manual?`)) remove.mutate({ id: habit.id }); }} />)}</section> : <EmptyHabits onSuggestion={title => { setEditing({ id: 0, title, cadence: "weekly", color: "teal", isActive: true, archivedAt: null, lastCheckinAt: null, weeklyCheckins: 0, monthlyCheckins: 0, checkins: [] }); setDialogOpen(true); }} />}
      {archivedHabits.length ? <Card className="surface-card"><CardHeader><CardTitle className="text-base">Archivados</CardTitle><CardDescription>Se conservan sin formar parte de la cobertura semanal.</CardDescription></CardHeader><CardContent className="space-y-2">{archivedHabits.map(habit => <div key={habit.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-medium">{habit.title}</p><p className="text-xs text-muted-foreground">{cadenceLabel[habit.cadence]}</p></div><Button size="icon" variant="ghost" aria-label={`Restaurar ${habit.title}`} title="Restaurar" onClick={() => archive.mutate({ id: habit.id, archived: false })}><RotateCcw className="size-4" /></Button></div>)}</CardContent></Card> : null}
    </> : <Card className="surface-card"><CardContent className="py-12 text-center"><HeartPulse className="mx-auto size-7 text-primary" /><h2 className="mt-3 font-semibold">Aún no activas el seguimiento de hábitos</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">No se registrará nada hasta que lo actives. Tus datos financieros existentes no se usarán para inventar hábitos.</p></CardContent></Card>}
    <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}><HabitForm key={editing?.id ?? "new"} habit={editing} saving={saveHabit.isPending} onSubmit={input => saveHabit.mutate(input)} /></Dialog>
  </section>;
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) { return <Card className="surface-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><strong className="mt-1 block text-2xl tabular-nums text-primary">{value}</strong><p className="mt-1 text-xs text-muted-foreground">{note}</p></CardContent></Card>; }

function HabitCard({ habit, checking, onCheck, onEdit, onArchive, onDelete }: { habit: Habit; checking: boolean; onCheck: () => void; onEdit: () => void; onArchive: () => void; onDelete: () => void }) { const tone = colorClass[habit.color] ?? colorClass.teal; return <Card className="surface-card overflow-hidden"><div className={`h-1 ${tone.split(" ")[1] ?? "bg-teal-50"}`} /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{habit.title}</h2><Badge variant="outline" className={tone}>{cadenceLabel[habit.cadence]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{habit.weeklyCheckins} registro(s) en 7 días · {habit.monthlyCheckins} en 30 días</p></div><div className="flex items-center"><Button size="icon" variant="ghost" aria-label={`Editar ${habit.title}`} title="Editar" onClick={onEdit}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`Archivar ${habit.title}`} title="Archivar" onClick={onArchive}><Archive className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${habit.title}`} title="Eliminar" onClick={onDelete}><Trash2 className="size-4 text-muted-foreground" /></Button></div></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button className="btn-primary" size="sm" disabled={checking} onClick={onCheck}><CheckCircle2 className="mr-2 size-4" />Registrar ahora</Button><p className="text-xs text-muted-foreground">{habit.lastCheckinAt ? `Último: ${new Date(habit.lastCheckinAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}` : "Sin registros todavía"}</p></div>{habit.checkins.length ? <div className="mt-4 flex flex-wrap gap-1.5">{habit.checkins.slice(0, 7).map(checkin => <span key={checkin.id} className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{new Date(checkin.completedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}</span>)}</div> : null}</CardContent></Card>; }

function EmptyHabits({ onSuggestion }: { onSuggestion: (title: string) => void }) { return <Card className="surface-card"><CardContent className="py-10 text-center"><CalendarCheck2 className="mx-auto size-7 text-primary" /><h2 className="mt-3 font-semibold">Define el primer hábito que deseas seguir</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Las sugerencias sólo llenan el formulario; no se guarda nada hasta que confirmes.</p><div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">{suggestions.map(title => <Button key={title} variant="outline" size="sm" onClick={() => onSuggestion(title)}>{title}</Button>)}</div></CardContent></Card>; }

function HabitForm({ habit, saving, onSubmit }: { habit: Habit | null; saving: boolean; onSubmit: (input: { id?: number; title: string; cadence: "daily" | "weekly" | "monthly"; color: "teal" | "emerald" | "sky" | "indigo" | "violet" | "amber" | "rose" }) => void }) { const [title, setTitle] = useState(habit?.title ?? ""); const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">(habit?.cadence ?? "weekly"); const [color, setColor] = useState<"teal" | "emerald" | "sky" | "indigo" | "violet" | "amber" | "rose">(habit?.color ?? "teal"); const submit = (event: FormEvent) => { event.preventDefault(); onSubmit({ ...(habit?.id ? { id: habit.id } : {}), title: title.trim(), cadence, color }); }; return <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{habit?.id ? "Editar hábito" : "Nuevo hábito"}</DialogTitle><DialogDescription>Es un registro privado y manual. No cambia tus movimientos, tu presupuesto ni tu Score.</DialogDescription></DialogHeader><form className="grid gap-4 py-2" onSubmit={submit}><div className="grid gap-2"><Label>Nombre</Label><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. Revisar pagos próximos" maxLength={140} required /></div><div className="grid gap-2"><Label>Frecuencia elegida</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={cadence} onChange={event => setCadence(event.target.value as typeof cadence)}><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></div><div className="grid gap-2"><Label>Color</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={color} onChange={event => setColor(event.target.value as typeof color)}>{Object.keys(colorClass).map(item => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select></div><Button className="btn-primary" type="submit" disabled={saving || !title.trim()}>{saving ? "Guardando…" : "Guardar hábito"}</Button></form></DialogContent>; }
