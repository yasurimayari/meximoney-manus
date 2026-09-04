import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { filterNotificationInbox, notificationDestination } from "@/lib/notificationInbox";
import { getPwaNotificationPermission, isPwaNotificationsEnabled, isPwaStandalone, requestPwaNotificationPermission, setPwaNotificationsEnabled, showPwaInboxNotification, updatePwaBadge, type PwaNotificationPermission } from "@/lib/pwaNotifications";
import { trpc } from "@/lib/trpc";
import { BellRing, CalendarDays, CheckCheck, ChevronRight, CreditCard, FileClock, HandCoins, Landmark, MessageCircle, PiggyBank, Plane, ReceiptText, ShieldCheck, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const notificationIcons = { calendar: CalendarDays, travel: Plane, payable: HandCoins, document: FileClock, debt: Landmark, credit_card_cutoff: CreditCard, credit_card_payment: CreditCard, credit_card_overlimit: CreditCard, budget: PiggyBank, tax_reserve: ReceiptText, review: CheckCheck } as const;
const categoryLabels: Record<string, string> = { calendar: "Calendario", travel: "Viajes", payable: "Cuentas por pagar", document: "Documentos", debt: "Deudas y cuotas", credit_card_cutoff: "Cortes de tarjeta", credit_card_payment: "Pagos de tarjeta", credit_card_overlimit: "Sobregiros", budget: "Presupuesto", tax_reserve: "Reserva fiscal", review: "Revisiones" };
const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });

type NotificationPreferences = {
  inAppEnabled: boolean;
  calendarEnabled: boolean;
  documentsEnabled: boolean;
  debtsEnabled: boolean;
  reviewsEnabled: boolean;
  budgetEnabled: boolean;
  taxReserveEnabled: boolean;
  travelsEnabled: boolean;
  reminderDays: number;
  creditUtilizationThresholdPercent: number;
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
  travelsEnabled: true,
  reminderDays: 7,
  creditUtilizationThresholdPercent: 20,
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
  const [pwaPermission, setPwaPermission] = useState<PwaNotificationPermission>(() => getPwaNotificationPermission());
  const [isInstalledApp] = useState(() => isPwaStandalone());
  const [pwaEnabledOnDevice, setPwaEnabledOnDevice] = useState(() => isPwaNotificationsEnabled());

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
  const refreshInbox = trpc.finance.notifications.refreshInbox.useMutation({ onError: error => toast.error(error.message) });
  const clearResolved = trpc.finance.notifications.clearResolved.useMutation({ onSuccess: async () => { await refresh(); toast.success("Avisos leídos o descartados eliminados."); }, onError: error => toast.error(error.message) });

  const savePreferenceState = (next: NotificationPreferences) => savePreferences.mutate({ inAppEnabled: next.inAppEnabled, calendarEnabled: next.calendarEnabled, documentsEnabled: next.documentsEnabled, debtsEnabled: next.debtsEnabled, reviewsEnabled: next.reviewsEnabled, budgetEnabled: next.budgetEnabled, taxReserveEnabled: next.taxReserveEnabled, travelsEnabled: next.travelsEnabled, reminderDays: next.reminderDays, creditUtilizationThresholdPercent: next.creditUtilizationThresholdPercent });
  const updatePreference = (key: "inAppEnabled" | "calendarEnabled" | "documentsEnabled" | "debtsEnabled" | "reviewsEnabled" | "budgetEnabled" | "taxReserveEnabled" | "travelsEnabled", value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    savePreferenceState(next);
  };
  const updateReminderDays = (reminderDays: number) => {
    const next = { ...preferences, reminderDays };
    setPreferences(next);
    savePreferenceState(next);
  };
  const updateCreditThreshold = (value: number) => {
    const creditUtilizationThresholdPercent = Math.max(1, Math.min(100, value));
    const next = { ...preferences, creditUtilizationThresholdPercent };
    setPreferences(next);
    savePreferenceState(next);
  };
  const updateTelegram = (enabled: boolean) => {
    setPreferences(current => ({ ...current, telegramEnabled: enabled }));
    setTelegramDaily.mutate({ enabled });
  };

  const unread = data?.notifications.filter(item => !item.readAt).length ?? 0;

  useEffect(() => {
    void updatePwaBadge(pwaEnabledOnDevice ? unread : 0).catch(() => undefined);
  }, [pwaEnabledOnDevice, unread]);

  useEffect(() => {
    const syncPermission = () => setPwaPermission(getPwaNotificationPermission());
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, []);

  const requestPwaPermission = async () => {
    const permission = await requestPwaNotificationPermission();
    setPwaPermission(permission);
    if (permission === "granted") { setPwaNotificationsEnabled(true); setPwaEnabledOnDevice(true); toast.success("Avisos PWA activados en este dispositivo."); }
    else if (permission === "denied") toast.error("El permiso fue denegado. Puedes cambiarlo en los ajustes del navegador o dispositivo.");
    else if (permission === "unsupported") toast.error("Este navegador no permite avisos PWA.");
  };

  const refreshPwaInbox = () => refreshInbox.mutate(undefined, {
    onSuccess: async result => {
      await refresh();
      const delivered = await showPwaInboxNotification(result.createdCount).catch(() => false);
      toast.success(result.skipped ? "La bandeja interna está desactivada." : result.createdCount ? `${result.createdCount} aviso${result.createdCount === 1 ? "" : "s"} actualizado${result.createdCount === 1 ? "" : "s"}${delivered ? " y mostrado en tu dispositivo." : "."}` : "No hay avisos nuevos.");
    },
    onError: error => toast.error(error.message),
  });
  const updatePwaDevicePreference = (enabled: boolean) => {
    setPwaNotificationsEnabled(enabled);
    setPwaEnabledOnDevice(enabled);
    toast.success(enabled ? "Avisos PWA activados en este dispositivo." : "Avisos PWA desactivados en este dispositivo.");
  };
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
          <p>Estos avisos aparecen dentro de Meximoney; Telegram comparte el resumen autorizado cuando se habilita explícitamente.</p>
        </div>
        <div className="workspace-role"><BellRing className="size-4" /> {unread} sin leer</div>
      </header>

      <section className="content-card">
        <div className="card-title-row"><div><h2>Personaliza tus avisos</h2><p>Elige qué recordatorios se muestran en tu bandeja. Los cambios se guardan sólo para tu perfil.</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <NotificationToggle label="Bandeja dentro de Meximoney" description="Muestra tus avisos privados en esta pantalla." checked={preferences.inAppEnabled} onChange={value => updatePreference("inAppEnabled", value)} />
          <NotificationToggle label="Fechas de calendario y obligaciones SAT" description="Eventos manuales programados en los próximos 7 días." checked={preferences.calendarEnabled} onChange={value => updatePreference("calendarEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Próximos viajes" description={`Viajes planeados que comienzan en los próximos ${preferences.reminderDays} días.`} checked={preferences.travelsEnabled} onChange={value => updatePreference("travelsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Documentos próximos a vencer" description="Referencias documentales con vencimiento cercano." checked={preferences.documentsEnabled} onChange={value => updatePreference("documentsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Deudas, cuotas y tarjetas" description="Vencimientos, cortes, pagos y sobregiros registrados manualmente." checked={preferences.debtsEnabled} onChange={value => updatePreference("debtsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Revisión mensual de presupuesto" description="Presupuestos del mes actual para contrastar manualmente con registros confirmados." checked={preferences.budgetEnabled} onChange={value => updatePreference("budgetEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Reserva fiscal manual" description="Fecha de referencia de tu reserva; no calcula ni presenta impuestos." checked={preferences.taxReserveEnabled} onChange={value => updatePreference("taxReserveEnabled", value)} disabled={!preferences.inAppEnabled} />
          <NotificationToggle label="Revisión humana" description="Movimientos que esperan confirmación de una persona autorizada." checked={preferences.reviewsEnabled} onChange={value => updatePreference("reviewsEnabled", value)} disabled={!preferences.inAppEnabled} />
          <div className="rounded-xl border bg-muted/25 p-4"><Label htmlFor="reminder-days" className="text-sm font-semibold">Anticipación</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">Define con cuántos días de margen se revisan viajes, pagos, tarjetas, documentos y calendario.</p><select id="reminder-days" className="mt-3 w-full" value={preferences.reminderDays} onChange={event => updateReminderDays(Number(event.target.value))}>{[1, 3, 7, 14, 30].map(days => <option key={days} value={days}>{days} día{days === 1 ? "" : "s"} antes</option>)}</select></div>
          <div className="rounded-xl border bg-muted/25 p-4"><Label htmlFor="credit-threshold" className="text-sm font-semibold">Alerta de utilización de crédito</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">Muestra una alerta en el Panel cuando una tarjeta supere este porcentaje de su límite.</p><div className="mt-3 flex items-center gap-2"><input id="credit-threshold" className="w-24" type="number" min={1} max={100} step={1} value={preferences.creditUtilizationThresholdPercent} onChange={event => updateCreditThreshold(Number(event.target.value))} /><span className="text-sm font-semibold text-muted-foreground">%</span></div><p className="mt-2 text-xs text-muted-foreground">Usa un valor entre 1% y 100%. Se guarda sólo para tu perfil.</p></div>
        </div>
        <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Resumen diario por Telegram</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Se ejecuta diariamente a las 08:00 de Ciudad de México. Incluye próximos viajes, vencimientos de deudas y cuentas por pagar, cortes y pagos de tarjetas dentro del margen elegido. Nunca incluye números de cuenta, credenciales, movimientos completos ni ejecuta pagos.</p></div>
            <Switch checked={preferences.telegramEnabled} disabled={!preferences.telegramScheduleCronTaskUid || setTelegramDaily.isPending} aria-label="Resumen diario por Telegram" onCheckedChange={updateTelegram} />
          </div>
          {!preferences.telegramScheduleCronTaskUid ? <p className="mt-3 text-xs text-muted-foreground">La programación segura aún está pendiente. Este interruptor se habilitará cuando quede registrada.</p> : null}
        </div>
        <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
          <div className="flex items-start gap-3"><Smartphone className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Avisos en este dispositivo</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Al actualizar manualmente la bandeja, Meximoney puede mostrar un aviso genérico con el número de recordatorios nuevos. No expone importes, saldos, nombres ni movimientos.</p><p className="mt-2 text-xs font-medium text-muted-foreground">Estado: {pwaPermission === "granted" ? "permitidos" : pwaPermission === "denied" ? "bloqueados por el dispositivo" : pwaPermission === "unsupported" ? "no compatibles en este navegador" : "pendientes de autorización"}{isInstalledApp ? " · PWA instalada" : " · añade Meximoney a la pantalla de inicio en iPhone para habilitar los avisos de la app instalada"}</p></div><Button type="button" size="sm" variant="outline" disabled={pwaPermission === "granted" || pwaPermission === "unsupported"} onClick={() => void requestPwaPermission()}>{pwaPermission === "granted" ? "Permiso listo" : "Autorizar"}</Button></div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-background/70 px-3 py-2"><div><p className="text-xs font-semibold">Mostrar avisos aquí</p><p className="mt-0.5 text-xs text-muted-foreground">Control local de esta instalación. No modifica Telegram.</p></div><Switch checked={pwaEnabledOnDevice} disabled={pwaPermission !== "granted"} onCheckedChange={updatePwaDevicePreference} aria-label="Mostrar avisos PWA en este dispositivo" /></div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Telegram funciona en segundo plano. Los avisos PWA de este dispositivo se muestran al actualizar o abrir Meximoney; no contienen importes ni nombres sensibles.</p>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-primary/[0.045] p-4 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>Consultar esta pantalla no crea avisos. Usa «Actualizar avisos» cuando quieras revisar tus datos manuales; no programa pagos, no se conecta a bancos y no envía correos o mensajes automáticos.</p></div>
      </section>

      <section className="content-card">
        <div className="card-title-row gap-3"><div><h2>Bandeja</h2><p>{data.notifications.length ? "Filtra, agrupa y abre el contexto relacionado sin salir de tu espacio privado." : "No hay avisos activos por ahora."}</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={refreshInbox.isPending || !preferences.inAppEnabled} onClick={refreshPwaInbox}>{refreshInbox.isPending ? "Actualizando…" : "Actualizar avisos"}</Button><Button type="button" size="sm" variant="ghost" disabled={clearResolved.isPending || !data.resolvedCount} onClick={() => { if (window.confirm(`Eliminar ${data.resolvedCount} aviso${data.resolvedCount === 1 ? "" : "s"} leído${data.resolvedCount === 1 ? "" : "s"} o descartado${data.resolvedCount === 1 ? "" : "s"}? Esta acción no altera tus datos financieros.`)) clearResolved.mutate({ confirmed: true }); }}>{clearResolved.isPending ? "Eliminando…" : `Limpiar resueltos${data.resolvedCount ? ` (${data.resolvedCount})` : ""}`}</Button></div></div>
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
