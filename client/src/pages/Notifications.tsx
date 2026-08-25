import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { filterNotificationInbox, notificationDestination } from "@/lib/notificationInbox";
import { trpc } from "@/lib/trpc";
import { BellRing, CalendarDays, CheckCheck, ChevronRight, CreditCard, FileClock, Landmark, MessageCircle, PiggyBank, ReceiptText, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const notificationIcons = { calendar: CalendarDays, document: FileClock, debt: Landmark, credit_card_cutoff: CreditCard, credit_card_payment: CreditCard, credit_card_overlimit: CreditCard, budget: PiggyBank, tax_reserve: ReceiptText, review: CheckCheck } as const;
const categoryLabels: Record<string, string> = { calendar: "Calendario", document: "Documentos", debt: "Deudas y cuotas", credit_card_cutoff: "Cortes de tarjeta", credit_card_payment: "Pagos de tarjeta", credit_card_overlimit: "Sobregiros", budget: "Presupuesto", tax_reserve: "Reserva fiscal", review: "Revisiones" };
const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

type NotificationPreferences = {
  inAppEnabled: boolean;
  calendarEnabled: boolean;
  documentsEnabled: boolean;
  debtsEnabled: boolean;
  reviewsEnabled: boolean;
  budgetEnabled: boolean;
  taxReserveEnabled: boolean;
  telegramEnabled: boolean;
  telegramScheduleCronTaskUid?: string | null;
};

type InboxItem = { id: number; type: string; title: string; message: string; occurredAt: Date | string; readAt: Date | string | null };

const defaultPreferences: NotificationPreferences = {
  inAppEnabled: true,
  calendarEnabled: true,
  documentsEnabled: true,
  debtsEnabled: true,
  reviewsEnabled: true,
  budgetEnabled: true,
  taxReserveEnabled: true,
  telegramEnabled: false,
  telegramScheduleCronTaskUid: null,
};

function notificationDayLabel(occurredAt: Date | string) {
  const date = new Date(occurredAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return dateFormatter.format(date);
}

export default function Notifications() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.finance.notifications.get.useQuery(undefined, { refetchOnMount: "always" });
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [category, setCategory] = useState("all");
  const [groupBy, setGroupBy] = useState<"date" | "category">("date");

  useEffect(() => {
    if (data?.preferences) setPreferences({ ...defaultPreferences, ...data.preferences });
  }, [data?.preferences]);

  const refresh = () => utils.finance.notifications.get.invalidate();
  const savePreferences = trpc.finance.notifications.savePreferences.useMutation({
    onSuccess: async () => { await refresh(); toast.success("Preferencias de notificación actualizadas."); },
    onError: error => toast.error(error.message),
  });
  const setTelegramDaily = trpc.finance.notifications.setTelegramDaily.useMutation({
    onSuccess: async () => { await refresh(); toast.success("Preferencia de Telegram actualizada."); },
    onError: error => { setPreferences(current => ({ ...current, telegramEnabled: !current.telegramEnabled })); toast.error(error.message); },
  });
  const markRead = trpc.finance.notifications.markRead.useMutation({ onSuccess: refresh });
  const dismiss = trpc.finance.notifications.dismiss.useMutation({ onSuccess: refresh });

  const updatePreference = (key: Exclude<keyof NotificationPreferences, "telegramEnabled" | "telegramScheduleCronTaskUid">, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    savePreferences.mutate({ inAppEnabled: next.inAppEnabled, calendarEnabled: next.calendarEnabled, documentsEnabled: next.documentsEnabled, debtsEnabled: next.debtsEnabled, reviewsEnabled: next.reviewsEnabled, budgetEnabled: next.budgetEnabled, taxReserveEnabled: next.taxReserveEnabled });
  };
  const updateTelegram = (enabled: boolean) => {
    setPreferences(current => ({ ...current, telegramEnabled: enabled }));
    setTelegramDaily.mutate({ enabled });
  };

  const unread = data?.notifications.filter(item => !item.readAt).length ?? 0;
  const availableCategories = useMemo(() => Array.from(new Set(data?.notifications.map(item => item.type) ?? [])), [data?.notifications]);
  const filteredNotifications = useMemo(() => filterNotificationInbox(data?.notifications ?? [], onlyUnread, category), [data?.notifications, onlyUnread, category]);
  const groupedNotifications = useMemo(() => filteredNotifications.reduce<Record<string, typeof filteredNotifications>>((groups, notification) => {
    const key = groupBy === "date" ? notificationDayLabel(notification.occurredAt) : (categoryLabels[notification.type] ?? "Otros");
    (groups[key] ??= []).push(notification);
    return groups;
  }, {}), [filteredNotifications, groupBy]);

  const openRelated = (notification: InboxItem) => {
    if (!notification.readAt) markRead.mutate({ id: notification.id });
    setLocation(notificationDestination(notification.type));
  };

  if (isLoading || !data) return <div className="page-loading">Preparando tus notificaciones privadas…</div>;

  return (
    <div className="space-y-7">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Recordatorios privados</p>
          <h1>Lo importante, sin ruido.</h1>
          <p>Estos avisos aparecen dentro de Meximoney; Telegram sólo comparte títulos cuando se habilita explícitamente.</p>
        </div>
        <div className="workspace-role"><BellRing className="size-4" /> {unread} sin leer</div>
      </header>

      <section className="content-card">
        <div className="card-title-row"><div><h2>Personaliza tus avisos</h2><p>Elige qué recordatorios se muestran en tu bandeja. Los cambios se guardan sólo para tu perfil.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <NotificationToggle label="Bandeja dentro de Meximoney" description="Muestra tus avisos privados en esta pantalla." checked={preferences.inAppEnabled} onChange={value => updatePreference("inAppEnabled", value)} />
          <NotificationToggle label="Fechas de calendario y obligaciones SAT" description="Eventos manuales programados en los próximos 7 días." checked={preferences.calendarEnabled} onChange={value => updatePreference("calendarEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Documentos próximos a vencer" description="Referencias documentales con vencimiento cercano." checked={preferences.documentsEnabled} onChange={value => updatePreference("documentsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Deudas, cuotas y tarjetas" description="Vencimientos, cortes, pagos y sobregiros registrados manualmente." checked={preferences.debtsEnabled} onChange={value => updatePreference("debtsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Revisión mensual de presupuesto" description="Presupuestos del mes actual para contrastar manualmente con registros confirmados." checked={preferences.budgetEnabled} onChange={value => updatePreference("budgetEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Reserva fiscal manual" description="Fecha de referencia de tu reserva; no calcula ni presenta impuestos." checked={preferences.taxReserveEnabled} onChange={value => updatePreference("taxReserveEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Revisión humana" description="Movimientos que esperan confirmación de una persona autorizada." checked={preferences.reviewsEnabled} onChange={value => updatePreference("reviewsEnabled", value)} disabled={!preferences.inAppEnabled} />
        </div>
        <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Resumen diario por Telegram</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Se ejecutará diariamente a las 08:00 de Ciudad de México. Si lo activas, Telegram recibirá sólo títulos de recordatorio; no incluye montos, saldos, datos bancarios ni ejecuta pagos. Al desactivarlo, la comprobación diaria continúa pero omite el envío.</p></div>
            <Switch checked={preferences.telegramEnabled} disabled={!preferences.telegramScheduleCronTaskUid || setTelegramDaily.isPending} aria-label="Resumen diario por Telegram" onCheckedChange={updateTelegram} />
          </div>
          {!preferences.telegramScheduleCronTaskUid ? <p className="mt-3 text-xs text-muted-foreground">La programación segura aún está pendiente. Este interruptor se habilitará cuando quede registrada.</p> : null}
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-primary/[0.045] p-4 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>Las notificaciones internas se generan al consultar esta bandeja. No programan pagos, no se conectan a bancos y no envían correos o mensajes automáticos.</p></div>
      </section>

      <section className="content-card">
        <div className="card-title-row"><div><h2>Bandeja</h2><p>{data.notifications.length ? "Filtra, agrupa y abre el contexto relacionado sin salir de tu espacio privado." : "No hay avisos activos por ahora."}</p></div></div>
        {data.notifications.length ? <>
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-muted/35 p-3">
            <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={onlyUnread ? "default" : "outline"} onClick={() => setOnlyUnread(current => !current)} aria-pressed={onlyUnread}>No leídas{unread ? ` (${unread})` : ""}</Button><span className="self-center text-xs font-medium text-muted-foreground">Categoría</span><Button type="button" size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")} aria-pressed={category === "all"}>Todas</Button>{availableCategories.map(item => <Button key={item} type="button" size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)} aria-pressed={category === item}>{categoryLabels[item] ?? "Otros"}</Button>)}</div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Agrupar por</span><Button type="button" size="sm" variant={groupBy === "date" ? "default" : "outline"} onClick={() => setGroupBy("date")} aria-pressed={groupBy === "date"}>Fecha</Button><Button type="button" size="sm" variant={groupBy === "category" ? "default" : "outline"} onClick={() => setGroupBy("category")} aria-pressed={groupBy === "category"}>Categoría</Button></div>
          </div>
          <div className="mt-5 space-y-6">
            {Object.entries(groupedNotifications).map(([group, notifications]) => <div key={group}><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{group}</h3><div className="space-y-3">{notifications.map(notification => <NotificationRow key={notification.id} notification={notification} markReadPending={markRead.isPending} dismissPending={dismiss.isPending} onOpen={openRelated} onMarkRead={id => markRead.mutate({ id })} onDismiss={id => dismiss.mutate({ id })} />)}</div></div>)}
          </div>
        </> : <div className="empty-state mt-5"><div className="empty-icon"><BellRing className="size-5" /></div><div><h3>Todo está al día</h3><p>Cuando haya una fecha próxima, una obligación SAT manual, un documento por vencer, una deuda o cuota próxima, un corte, pago o sobregiro de tarjeta, una revisión mensual de presupuesto o un movimiento que requiera revisión, aparecerá aquí según tus preferencias.</p></div></div>}
      </section>
    </div>
  );
}

function NotificationRow({ notification, markReadPending, dismissPending, onOpen, onMarkRead, onDismiss }: { notification: InboxItem; markReadPending: boolean; dismissPending: boolean; onOpen: (notification: InboxItem) => void; onMarkRead: (id: number) => void; onDismiss: (id: number) => void }) {
  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] ?? BellRing;
  return (
    <article className={`flex items-start gap-4 rounded-2xl border p-4 ${notification.readAt ? "bg-muted/30" : "border-primary/25 bg-primary/[0.035]"}`}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{notification.title}</h4>{notification.readAt ? <span className="rounded-full bg-muted px-2 py-1 text-[0.62rem] font-bold text-muted-foreground">Leído</span> : <span className="rounded-full bg-primary/10 px-2 py-1 text-[0.62rem] font-bold text-primary">Nuevo</span>}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
        <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onOpen(notification)}>Abrir contexto relacionado <ChevronRight className="size-3" /></button>
      </div>
      <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" aria-label="Marcar como leído" disabled={Boolean(notification.readAt) || markReadPending} onClick={() => onMarkRead(notification.id)}><CheckCheck className="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Descartar notificación" disabled={dismissPending} onClick={() => onDismiss(notification.id)}><X className="size-4" /></Button></div>
    </article>
  );
}

function NotificationToggle({ label, description, checked, onChange, disabled = false }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/25 p-4"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><Switch checked={checked} disabled={disabled} aria-label={label} onCheckedChange={onChange} /></div>;
}
