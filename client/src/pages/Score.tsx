import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { creditScoreRange, creditScoreRanges, creditScoreSourceUrl } from "@/lib/creditScoreRange";
import { trpc } from "@/lib/trpc";
import { latestActiveCreditReport, nextCreditReportDueDate } from "@shared/creditReportUtils";
import { Archive, Award, CalendarClock, ChartNoAxesCombined, CircleDollarSign, CreditCard, Download, ExternalLink, FileText, Grid2X2, List, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const factorLabels = [
  ["netWorthPoints", "Patrimonio neto", 200],
  ["creditUtilizationPoints", "Utilización de tarjetas", 200],
  ["creditScorePoints", "Score crediticio manual", 150],
  ["emergencyFundPoints", "Fondo de emergencia", 150],
  ["cashFlowPoints", "Flujo positivo del periodo", 100],
  ["habitPoints", "Hábito de registro · 7 días", 100],
  ["debtPaymentPoints", "Pago de principal · 30 días", 100],
] as const;

const levelTone: Record<string, string> = {
  Crisis: "bg-rose-100 text-rose-800",
  Sobreviviendo: "bg-orange-100 text-orange-800",
  Estable: "bg-amber-100 text-amber-800",
  Construyendo: "bg-emerald-100 text-emerald-800",
  "Próspera": "bg-teal-100 text-teal-800",
};

const percentage = (value: number | null) => value === null ? "Pendiente" : new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(value);

export default function Score() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.finance.score.overview.useQuery();
  const [creditOpen, setCreditOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<CreditReportRow | null>(null);
  const saveCredit = trpc.finance.score.saveCreditRecord.useMutation({
    onSuccess: async () => {
      await utils.finance.score.overview.invalidate();
      setCreditOpen(false);
      toast.success("Score crediticio manual guardado.");
    },
    onError: error => toast.error(error.message),
  });
  const removeCredit = trpc.finance.score.removeCreditRecord.useMutation({
    onSuccess: async () => {
      await utils.finance.score.overview.invalidate();
      toast.success("Registro de score crediticio eliminado.");
    },
    onError: error => toast.error(error.message),
  });
  const saveReport = trpc.finance.score.saveCreditReport.useMutation({
    onSuccess: async () => { await utils.finance.score.overview.invalidate(); setReportOpen(false); setEditingReport(null); toast.success("Informe crediticio guardado de forma privada."); },
    onError: error => toast.error(error.message),
  });
  const archiveReport = trpc.finance.score.archiveCreditReport.useMutation({ onSuccess: async () => { await utils.finance.score.overview.invalidate(); toast.success("Informe archivado."); }, onError: error => toast.error(error.message) });
  const restoreReport = trpc.finance.score.restoreCreditReport.useMutation({ onSuccess: async () => { await utils.finance.score.overview.invalidate(); toast.success("Informe restaurado."); }, onError: error => toast.error(error.message) });
  const removeReport = trpc.finance.score.removeCreditReport.useMutation({ onSuccess: async () => { await utils.finance.score.overview.invalidate(); toast.success("Informe eliminado."); }, onError: error => toast.error(error.message) });
  const saveSnapshot = trpc.finance.score.saveSnapshot.useMutation({
    onSuccess: async () => {
      await utils.finance.score.overview.invalidate();
      setSnapshotOpen(false);
      toast.success("Corte de SPF Score guardado de forma manual.");
    },
    onError: error => toast.error(error.message),
  });
  const history = useMemo(() => {
    const points = new Map<string, { timestamp: number; spfScore?: number; creditScore?: number }>();
    (data?.snapshots ?? []).forEach((item: any) => {
      const timestamp = new Date(item.periodStart).getTime();
      const key = new Date(timestamp).toISOString().slice(0, 10);
      points.set(key, { ...(points.get(key) ?? { timestamp }), timestamp, spfScore: item.totalScore });
    });
    (data?.creditRecords ?? []).forEach((item: any) => {
      const timestamp = new Date(item.reportedAt).getTime();
      const key = new Date(timestamp).toISOString().slice(0, 10);
      points.set(key, { ...(points.get(key) ?? { timestamp }), timestamp, creditScore: item.score });
    });
    return Array.from(points.values())
      .sort((left, right) => left.timestamp - right.timestamp)
      .map(item => ({ ...item, period: new Date(item.timestamp).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" }) }));
  }, [data?.creditRecords, data?.snapshots]);

  if (isLoading || !data) return <section><p className="page-subtitle">Calculando tus factores manuales…</p></section>;

  const latestCredit = [...data.creditRecords].sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())[0] ?? null;
  const latestCreditRange = creditScoreRange(latestCredit?.score);

  return <section className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">Indicadores explicables</p>
        <h1 className="page-title">Score financiero</h1>
        <p className="page-subtitle">Tu score crediticio se registra manualmente. El SPF resume datos ya confirmados en Richeon; no predice ni consulta Buró.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setCreditOpen(true)}><Plus className="mr-2 size-4"/>Score crediticio</Button>
        <Button className="btn-primary" onClick={() => setSnapshotOpen(true)}><CalendarClock className="mr-2 size-4"/>Guardar corte SPF</Button>
      </div>
    </header>

    <Card className="surface-card overflow-hidden">
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-primary/5 text-center">
          <div className="text-5xl font-bold tracking-tight text-primary">{data.totalScore}</div>
          <p className="mt-1 text-sm text-muted-foreground">de 1,000 puntos</p>
          <Badge className={`mt-3 border-0 ${levelTone[data.level] ?? "bg-muted"}`}>{data.level}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {factorLabels.map(([key, label, maximum]) => {
            const points = data.factors[key];
            return <div key={key} className="rounded-xl border border-border/70 p-3">
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium leading-5">{label}</p><strong className="shrink-0 text-sm">{points}/{maximum}</strong></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(points / maximum) * 100}%` }}/></div>
            </div>;
          })}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="surface-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4 text-primary"/>Score crediticio manual</CardTitle>
          <CardDescription>Dato que tú capturas desde tu fuente de consulta; Richeon no accede a Buró.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestCredit ? <LatestCreditScore score={latestCredit.score} reportedAt={latestCredit.reportedAt} source={latestCredit.source}/> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aún no has agregado un score crediticio. Este factor se mantiene pendiente, no se estima.</p>}
          <CreditScoreScale currentScore={latestCredit?.score}/>
          <div className="space-y-2">
            {[...data.creditRecords].sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()).slice(0, 5).map((record: any) => <CreditScoreHistoryRow key={record.id} record={record} removePending={removeCredit.isPending} onRemove={() => {
              if (window.confirm("¿Eliminar este registro manual de score crediticio?")) removeCredit.mutate({ id: record.id });
            }}/>) }
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CircleDollarSign className="size-4 text-primary"/>Cómo se interpreta</CardTitle>
          <CardDescription>Base: patrimonio, tarjetas, score manual, fondo, flujo, hábito y pago de deuda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Utilización TDC</p><strong>{percentage(data.creditUtilizationRatio)}</strong></div>
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Pago de deuda · 30d</p><strong>{percentage(data.debtPaymentRatio)}</strong></div>
          </div>
          {data.dataGaps.length ? <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950"><p className="font-semibold">Información pendiente</p>{data.dataGaps.map((gap: string) => <p className="mt-1" key={gap}>{gap}</p>)}</div> : <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-950">Los factores disponibles tienen datos manuales para este corte. Revisa las valuaciones y saldos antes de guardarlo.</p>}
          <p className="text-xs leading-5 text-muted-foreground">Rangos SPF: 0–249 Crisis, 250–499 Sobreviviendo, 500–699 Estable, 700–849 Construyendo y 850–1,000 Próspera.</p>
        </CardContent>
      </Card>
    </div>

    <CreditReportSection reports={data.creditReports ?? []} saving={saveReport.isPending} onAdd={() => { setEditingReport(null); setReportOpen(true); }} onEdit={report => { setEditingReport(report); setReportOpen(true); }} onArchive={id => archiveReport.mutate({ id })} onRestore={id => restoreReport.mutate({ id })} onRemove={id => removeReport.mutate({ id })} />

    <Card className="surface-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ChartNoAxesCombined className="size-4 text-primary"/>Evolución de progreso y crédito</CardTitle>
        <CardDescription>El historial combina sólo cortes SPF y consultas crediticias que tú guardas manualmente; los periodos sin dato no se estiman.</CardDescription>
      </CardHeader>
      <CardContent>{history.length < 2 ? <p className="py-10 text-center text-sm text-muted-foreground">Guarda al menos dos puntos entre cortes SPF o consultas de score crediticio para ver su evolución.</p> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="period" fontSize={12}/><YAxis domain={[0, 1000]} fontSize={12}/><Tooltip formatter={(value: number, name: string) => [`${value} puntos`, name]}/><Line connectNulls type="monotone" dataKey="spfScore" name="SPF Score" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 4 }}/><Line connectNulls type="monotone" dataKey="creditScore" name="Score crediticio manual" stroke="#64748b" strokeWidth={2.5} dot={<CreditScoreDot/>}/></LineChart></ResponsiveContainer></div>}</CardContent>
    </Card>

    <Dialog open={creditOpen} onOpenChange={setCreditOpen}><CreditScoreForm saving={saveCredit.isPending} onSubmit={input => saveCredit.mutate(input)}/></Dialog>
    <Dialog open={reportOpen} onOpenChange={open => { setReportOpen(open); if (!open) setEditingReport(null); }}><CreditReportForm key={editingReport?.id ?? "new"} report={editingReport} saving={saveReport.isPending} onSubmit={input => saveReport.mutate(input)}/></Dialog>
    <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}><SnapshotForm saving={saveSnapshot.isPending} onSubmit={input => saveSnapshot.mutate(input)}/></Dialog>
  </section>;
}

function LatestCreditScore({ score, reportedAt, source }: { score: number; reportedAt: Date | string; source?: string | null }) {
  const range = creditScoreRange(score);
  return <div className={`relative overflow-hidden rounded-xl border p-4 ${range.className}`}>
    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: range.solidColor }}/>
    <div className="flex items-start justify-between gap-3 pt-1">
      <div><p className="text-3xl font-bold tabular-nums">{score}</p><p className="mt-1 text-sm">Consultado el {new Date(reportedAt).toLocaleDateString("es-MX")}{source ? ` · ${source}` : ""}</p></div>
      <Badge className={`border ${range.badgeClassName}`}>{range.title}</Badge>
    </div>
    <p className="mt-3 text-xs font-semibold">Rango {range.label} · {range.description}</p>
  </div>;
}

function CreditScoreScale({ currentScore }: { currentScore?: number | null }) {
  const currentRange = creditScoreRange(currentScore);
  return <section aria-labelledby="credit-score-scale-title" className="rounded-xl border border-border/70 bg-muted/20 p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><p id="credit-score-scale-title" className="text-xs font-semibold">Escala de Mi Score</p><span className="text-[10px] text-muted-foreground">Rangos de referencia</span></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-4">
      {creditScoreRanges.map(range => {
        const selected = range.key === currentRange.key;
        return <div key={range.key} className={`rounded-lg border p-2.5 ${range.className} ${selected ? "ring-2 ring-offset-1 ring-primary" : ""}`} aria-current={selected ? "true" : undefined}>
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: range.solidColor }}/><strong className="text-[11px]">{range.title}</strong></div>
          <p className="mt-1 text-sm font-bold tabular-nums">{range.label}</p>
          <p className="mt-0.5 text-[10px] leading-4">{range.description}</p>
        </div>;
      })}
    </div>
    {currentScore !== undefined && currentScore !== null && currentRange.key === "unclassified" ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-5 text-slate-700">Este valor no cae en un intervalo publicado por Buró de Crédito. Richeon no le asigna un color ni una categoría.</p> : null}
    <a className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={creditScoreSourceUrl} target="_blank" rel="noreferrer">Ver rangos publicados por Buró de Crédito <ExternalLink className="size-3"/></a>
  </section>;
}

function CreditScoreHistoryRow({ record, removePending, onRemove }: { record: any; removePending: boolean; onRemove: () => void }) {
  const range = creditScoreRange(record.score);
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
    <div className="min-w-0 flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: range.solidColor }}/><div className="min-w-0"><p className="truncate text-sm font-semibold tabular-nums">{record.score} puntos <span className="font-normal text-muted-foreground">· {range.title}</span></p><p className="truncate text-xs text-muted-foreground">{new Date(record.reportedAt).toLocaleDateString("es-MX")}{record.source ? ` · ${record.source}` : ""}</p></div></div>
    <Button size="icon" variant="ghost" aria-label="Eliminar score crediticio" disabled={removePending} onClick={onRemove}><Trash2 className="size-4 text-muted-foreground"/></Button>
  </div>;
}

function CreditScoreDot(props: any) {
  const { cx, cy, payload } = props;
  if (typeof cx !== "number" || typeof cy !== "number" || typeof payload?.creditScore !== "number") return null;
  const range = creditScoreRange(payload.creditScore);
  return <circle cx={cx} cy={cy} r={4.5} fill={range.solidColor} stroke="white" strokeWidth={2}><title>{`${payload.creditScore} puntos · ${range.title}`}</title></circle>;
}

function CreditScoreForm({ saving, onSubmit }: { saving: boolean; onSubmit: (input: any) => void }) {
  const [form, setForm] = useState({ score: "", source: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ score: Number(form.score), source: form.source || null, reportedAt: new Date(`${form.date}T12:00:00`).getTime(), notes: form.notes || null });
  };
  return <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Registrar score crediticio</DialogTitle><DialogDescription>Captura el dato que consultaste. No se conecta a Buró ni se estima un valor.</DialogDescription></DialogHeader><form className="grid gap-4 py-2" onSubmit={submit}><div className="grid gap-2"><Label>Score consultado</Label><Input required type="number" min="0" max="1000" value={form.score} onChange={event => setForm({ ...form, score: event.target.value })}/></div><div className="grid gap-2"><Label>Fuente de consulta</Label><Input value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} placeholder="Opcional"/></div><div className="grid gap-2"><Label>Fecha de consulta</Label><Input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })}/></div><div className="grid gap-2"><Label>Notas privadas</Label><Textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></div><Button className="btn-primary" type="submit" disabled={saving || !form.score}>{saving ? "Guardando…" : "Guardar score manual"}</Button></form></DialogContent>;
}

function SnapshotForm({ saving, onSubmit }: { saving: boolean; onSubmit: (input: any) => void }) {
  const [notes, setNotes] = useState("");
  return <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Guardar corte SPF</DialogTitle><DialogDescription>Se conserva el cálculo actual y los siete factores como historial. Esta acción no genera movimientos ni notificaciones.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Observación del corte</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Opcional" maxLength={3000}/></div><Button className="btn-primary" onClick={() => onSubmit({ notes: notes || null })} disabled={saving}>{saving ? "Guardando…" : "Confirmar corte manual"}</Button></div></DialogContent>;
}


type CreditReportRow = { id: number; provider: "buro" | "circulo"; consultedAt: Date | string; reportedScore?: number | null; periodLabel?: string | null; fileName: string; fileUrl?: string | null; fileSizeBytes: number; notes?: string | null; status: "active" | "archived"; archivedAt?: Date | string | null };

type CreditReportInput = { id?: number; provider: "buro" | "circulo"; consultedAt: number; reportedScore: number | null; periodLabel: string | null; notes: string | null; fileUpload?: { fileName: string; mimeType: string; base64: string } | null };

function CreditReportSection({ reports, saving, onAdd, onEdit, onArchive, onRestore, onRemove }: { reports: CreditReportRow[]; saving: boolean; onAdd: () => void; onEdit: (report: CreditReportRow) => void; onArchive: (id: number) => void; onRestore: (id: number) => void; onRemove: (id: number) => void }) {
  const activeReports = reports.filter(report => report.status === "active");
  const archivedReports = reports.filter(report => report.status === "archived");
  const currentYear = new Date().getFullYear();
  const currentYearCount = activeReports.filter(report => new Date(report.consultedAt).getFullYear() === currentYear).length;
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const latestReport = latestActiveCreditReport(activeReports);
  const nextConsultation = latestReport ? nextCreditReportDueDate(latestReport.consultedAt) : null;
  const isConsultationDue = nextConsultation ? nextConsultation.getTime() <= Date.now() : true;
  return <Card className="surface-card">
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary"/>Informes crediticios</CardTitle><CardDescription>Guarda tus informes PDF del Buró de Crédito y Círculo de Crédito. Richeon sólo almacena el archivo y sus metadatos; no interpreta su contenido.</CardDescription></div>
      <div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-lg border bg-background p-1" aria-label="Vista de informes"><Button type="button" size="icon" variant={viewMode === "cards" ? "secondary" : "ghost"} aria-label="Vista de tarjetas" title="Vista de tarjetas" onClick={() => setViewMode("cards")}><Grid2X2 className="size-4"/></Button><Button type="button" size="icon" variant={viewMode === "list" ? "secondary" : "ghost"} aria-label="Vista de lista" title="Vista de lista" onClick={() => setViewMode("list")}><List className="size-4"/></Button></div><Button className="btn-primary shrink-0" onClick={onAdd}><Plus className="mr-2 size-4"/>Subir informe</Button></div>
    </CardHeader>
      <CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Consultas este año</p><strong className="text-xl tabular-nums">{currentYearCount}<span className="text-sm font-normal text-muted-foreground">/4 recomendadas</span></strong></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Informes activos</p><strong className="text-xl tabular-nums">{activeReports.length}</strong></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Instituciones</p><strong className="text-xl">{new Set(activeReports.map(report => report.provider)).size}</strong></div></div>
      <div className={`rounded-xl border p-4 ${isConsultationDue ? "border-amber-300 bg-amber-50/70 text-amber-950" : "border-emerald-200 bg-emerald-50/70 text-emerald-950"}`}><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 size-5 shrink-0"/><div><p className="font-semibold">{isConsultationDue ? "Consulta trimestral pendiente" : "Próxima consulta trimestral"}</p><p className="mt-1 text-sm">{nextConsultation ? `Programa tu siguiente consulta para el ${nextConsultation.toLocaleDateString("es-MX")}.` : "Sube tu primer informe para comenzar el seguimiento trimestral."}</p></div></div></div>
      {reports.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Aún no has subido informes. Puedes guardar hasta cuatro consultas anuales como referencia de tu seguimiento.</div> : <div className={viewMode === "list" ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>{reports.map(report => <CreditReportCard key={report.id} report={report} list={viewMode === "list"} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} onRemove={onRemove}/>)}</div>}
      {saving ? <p className="text-xs text-muted-foreground">Guardando el informe de forma segura…</p> : null}
      {archivedReports.length ? <p className="text-xs text-muted-foreground">{archivedReports.length} informe(s) archivado(s) se conserva(n) separado(s) de los activos.</p> : null}
    </CardContent>
  </Card>;
}

function CreditReportCard({ report, list, onEdit, onArchive, onRestore, onRemove }: { report: CreditReportRow; list: boolean; onEdit: (report: CreditReportRow) => void; onArchive: (id: number) => void; onRestore: (id: number) => void; onRemove: (id: number) => void }) {
  const provider = report.provider === "buro" ? "Buró de Crédito" : "Círculo de Crédito";
  const size = `${Math.max(1, Math.round(report.fileSizeBytes / 1024))} KB`;
  const badgeClass = report.provider === "buro" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-violet-200 bg-violet-50 text-violet-800";
  return <article className={`${list ? "flex flex-wrap items-center gap-4" : ""} rounded-xl border p-4 ${report.status === "archived" ? "bg-muted/30 opacity-80" : "bg-background"}`}><div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{provider}</span><Badge variant={report.status === "active" ? "secondary" : "outline"}>{report.status === "active" ? "Activo" : "Archivado"}</Badge></div><p className="mt-2 truncate text-xs text-muted-foreground">{report.fileName} · {size}</p></div></div><div className={`${list ? "flex-1" : "mt-3"} grid grid-cols-2 gap-3 text-sm sm:grid-cols-3`}><div><p className="text-xs text-muted-foreground">Fecha de consulta</p><p className="font-medium">{new Date(report.consultedAt).toLocaleDateString("es-MX")}</p></div><div><p className="text-xs text-muted-foreground">Periodo</p><p className="font-medium">{report.periodLabel || "Sin especificar"}</p></div><div><p className="text-xs text-muted-foreground">Score del informe</p><p className="font-semibold tabular-nums">{report.reportedScore ?? "No registrado"}</p></div></div>{report.notes ? <p className={`${list ? "flex-1" : "mt-3"} line-clamp-2 text-xs text-muted-foreground`}>{report.notes}</p> : null}<div className={`${list ? "ml-auto" : "mt-4"} flex flex-wrap items-center gap-2`}>{report.fileUrl ? <a className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline" href={report.fileUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5"/>Ver documento</a> : null}<Button size="icon" variant="ghost" aria-label={`Editar informe de ${provider}`} title="Editar" onClick={() => onEdit(report)}><Pencil className="size-4"/></Button>{report.status === "active" ? <Button size="icon" variant="ghost" aria-label={`Archivar informe de ${provider}`} title="Archivar" onClick={() => onArchive(report.id)}><Archive className="size-4"/></Button> : <Button size="icon" variant="ghost" aria-label={`Restaurar informe de ${provider}`} title="Restaurar" onClick={() => onRestore(report.id)}><RotateCcw className="size-4"/></Button>}<Button size="icon" variant="ghost" aria-label={`Eliminar informe de ${provider}`} title="Eliminar" onClick={() => { if (window.confirm("¿Eliminar definitivamente este informe?")) onRemove(report.id); }}><Trash2 className="size-4 text-muted-foreground"/></Button></div></article>;
}

function CreditReportForm({ report, saving, onSubmit }: { report: CreditReportRow | null; saving: boolean; onSubmit: (input: CreditReportInput) => void }) {
  const [provider, setProvider] = useState<CreditReportInput["provider"]>(report?.provider ?? "buro");
  const [date, setDate] = useState(report ? new Date(report.consultedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [reportedScore, setReportedScore] = useState(report?.reportedScore == null ? "" : String(report.reportedScore));
  const [periodLabel, setPeriodLabel] = useState(report?.periodLabel ?? "");
  const [notes, setNotes] = useState(report?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); const score = reportedScore.trim() ? Number(reportedScore) : null; if (score !== null && (!Number.isInteger(score) || score < 0 || score > 1000)) { setError("El Score debe ser un número entero entre 0 y 1,000."); return; } if (!file && !report) { setError("Selecciona un informe PDF."); return; } if (file && file.type !== "application/pdf") { setError("Sólo se admiten archivos PDF."); return; } if (file && file.size > 10 * 1024 * 1024) { setError("El PDF no puede superar 10 MB."); return; } const fileUpload = file ? { fileName: file.name, mimeType: file.type, base64: await fileToBase64(file) } : null; onSubmit({ id: report?.id, provider, consultedAt: new Date(`${date}T12:00:00`).getTime(), reportedScore: score, periodLabel: periodLabel.trim() || null, notes: notes.trim() || null, fileUpload }); };
  return <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{report ? "Editar informe crediticio" : "Subir informe crediticio"}</DialogTitle><DialogDescription>PDF privado, máximo 10 MB. Registra la fecha real de consulta y el Score que aparece en tu informe.</DialogDescription></DialogHeader><form className="grid gap-4 py-2" onSubmit={submit}><div className="grid gap-2"><Label>Institución</Label><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={provider} onChange={event => setProvider(event.target.value as CreditReportInput["provider"])}><option value="buro">Buró de Crédito</option><option value="circulo">Círculo de Crédito</option></select></div><div className="grid gap-2"><Label>Fecha de consulta</Label><Input required type="date" value={date} onChange={event => setDate(event.target.value)}/></div><div className="grid gap-2"><Label>Score del informe (opcional)</Label><Input type="number" min="0" max="1000" step="1" value={reportedScore} onChange={event => setReportedScore(event.target.value)} placeholder="Ej. 720"/></div><div className="grid gap-2"><Label>Periodo o trimestre (opcional)</Label><Input value={periodLabel} onChange={event => setPeriodLabel(event.target.value)} placeholder="Ej. T3 2026" maxLength={80}/></div><div className="grid gap-2"><Label>{report ? "Reemplazar informe PDF (opcional)" : "Informe PDF"}</Label><Input required={!report} type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] ?? null)}/></div><div className="grid gap-2"><Label>Notas privadas (opcional)</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={3000}/></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button className="btn-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : report ? "Guardar cambios" : "Guardar informe"}</Button></form></DialogContent>;
}

function fileToBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const result = String(reader.result ?? ""); resolve(result.includes(",") ? result.split(",", 2)[1] : result); }; reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el archivo.")); reader.readAsDataURL(file); }); }
