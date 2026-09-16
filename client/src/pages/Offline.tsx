import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockOfflineSnapshot, type OfflineSnapshot } from "@/lib/offlineVault";
import { ChevronLeft, ChevronRight, CloudOff, LockKeyhole, Search, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const OFFLINE_PAGE_SIZE = 20;

function formatOfflineMoney(value: unknown, currency = "MXN") {
  return typeof value === "number" ? new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value / 100) : "—";
}

function itemName(item: any, fallback: string) {
  return item.name ?? item.title ?? item.description ?? item.creditor ?? item.merchant ?? fallback;
}

function haystack(item: any, fallback: string) {
  return [itemName(item, fallback), item.type, item.status, item.scope, item.currency, item.categoryName, item.eventType].filter(Boolean).join(" ").toLocaleLowerCase("es-MX");
}

export default function Offline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pin, setPin] = useState("");
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => { setTransactionPage(1); }, [snapshot?.cachedAt, query]);

  const unlock = async () => {
    setUnlocking(true);
    try { setSnapshot(await unlockOfflineSnapshot(pin)); setPin(""); } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible abrir la copia offline."); } finally { setUnlocking(false); }
  };

  if (!snapshot) return <main className="offline-shell"><section className="offline-card"><div className="offline-mark">M</div><p className="eyebrow">Meximoney personal</p><h1>Tu copia offline está protegida.</h1><p>Introduce el código local que definiste en este dispositivo. No se enviará a Internet.</p><div className="form-field mt-6"><label htmlFor="offline-unlock">Código local</label><Input id="offline-unlock" type="password" autoComplete="current-password" minLength={8} value={pin} onChange={event => setPin(event.target.value)} onKeyDown={event => event.key === "Enter" && unlock()} /></div><Button className="mt-5 w-full" disabled={unlocking || !pin} onClick={unlock}><LockKeyhole className="size-4" /> {unlocking ? "Desbloqueando…" : "Abrir copia offline"}</Button><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-1">{online ? <Wifi className="size-3" /> : <CloudOff className="size-3" />}{online ? "Con conexión" : "Sin conexión"}</span><a className="font-semibold text-primary hover:underline" href="/">Abrir Meximoney en línea</a></div></section></main>;

  return <main className="offline-shell"><section className="offline-data-shell"><header className="offline-data-header"><div><div className="offline-mark">M</div><p className="eyebrow mt-4">Consulta offline personal</p><h1>Resumen guardado</h1><p>Actualizado el {new Date(snapshot.cachedAt).toLocaleString("es-MX")}. Esta vista es sólo de consulta y no sincroniza cambios.</p></div><div className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Cifrado local</div></header><OfflineOverview snapshot={snapshot} /><section className="mt-6 rounded-2xl border bg-background p-4 sm:p-5"><label className="sr-only" htmlFor="offline-search">Buscar en la copia offline</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="offline-search" className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar movimientos, tareas, cuentas o viajes…" /></div><p className="mt-2 text-xs text-muted-foreground">La búsqueda se realiza sólo en la copia cifrada ya desbloqueada y no envía información a Internet.</p></section><OfflineNav /><OfflineTransactions snapshot={snapshot} query={query} page={transactionPage} setPage={setTransactionPage} /><OfflineCollections snapshot={snapshot} query={query} /><a href="/" className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline">Volver a Meximoney en línea</a></section></main>;
}

function OfflineOverview({ snapshot }: { snapshot: OfflineSnapshot }) {
  const items = useMemo(() => [{ label: "Cuentas", value: snapshot.accounts.length }, { label: "Tarjetas", value: snapshot.creditCards.length }, { label: "Deudas", value: snapshot.debts.length }, { label: "Movimientos", value: snapshot.transactions.length }, { label: "Tareas", value: snapshot.tasks.length }, { label: "Viajes", value: snapshot.travelPlans.length }, { label: "Calendario", value: snapshot.calendarEvents.length }, { label: "Estados", value: snapshot.statements.length }], [snapshot]);
  return <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(item => <article className="rounded-2xl border bg-background p-4" key={item.label}><strong className="text-2xl tabular-nums">{item.value}</strong><p className="mt-1 text-xs text-muted-foreground">{item.label}</p></article>)}</section>;
}

function OfflineNav() {
  return <nav aria-label="Secciones de la copia offline" className="mt-6 flex gap-2 overflow-x-auto pb-1 text-sm"><a href="#offline-movements" className="whitespace-nowrap rounded-full border px-3 py-1.5 font-medium">Movimientos</a><a href="#offline-collections" className="whitespace-nowrap rounded-full border px-3 py-1.5 font-medium">Información guardada</a></nav>;
}

function OfflineTransactions({ snapshot, query, page, setPage }: { snapshot: OfflineSnapshot; query: string; page: number; setPage: (page: number) => void }) {
  const normalized = query.trim().toLocaleLowerCase("es-MX");
  const transactions = ((snapshot.transactions ?? []) as any[]).filter(item => !normalized || haystack(item, item.type ?? "Movimiento").includes(normalized));
  const totalPages = Math.max(1, Math.ceil(transactions.length / OFFLINE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleTransactions = transactions.slice((safePage - 1) * OFFLINE_PAGE_SIZE, safePage * OFFLINE_PAGE_SIZE);
  return <section id="offline-movements" className="mt-6 rounded-2xl border bg-background p-4 sm:p-5"><h2 className="font-semibold">Movimientos guardados</h2><p className="mt-1 text-xs text-muted-foreground">{transactions.length} de {snapshot.transactions.length} movimientos coinciden. Esta vista no permite registrar, editar, aprobar ni sincronizar.</p><div className="mt-4 divide-y">{visibleTransactions.map(transaction => <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={transaction.id ?? `${transaction.occurredAt}-${transaction.amountCents}`}><div className="min-w-0"><p className="truncate font-medium">{itemName(transaction, transaction.type ?? "Movimiento")}</p><p className="text-xs text-muted-foreground">{transaction.occurredAt ? new Date(transaction.occurredAt).toLocaleDateString("es-MX") : "Fecha no disponible"} · {transaction.type ?? "Sin tipo"}</p></div><strong>{formatOfflineMoney(transaction.amountCents, transaction.currency)}</strong></div>)}</div>{!transactions.length ? <p className="py-4 text-sm text-muted-foreground">No hay coincidencias de movimientos en la copia local.</p> : null}{transactions.length > OFFLINE_PAGE_SIZE ? <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4"><Button type="button" size="sm" variant="outline" disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft className="size-4" /> Anterior</Button><span className="text-xs text-muted-foreground">{safePage}/{totalPages}</span><Button type="button" size="sm" variant="outline" disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>Siguiente <ChevronRight className="size-4" /></Button></div> : null}</section>;
}

function OfflineCollections({ snapshot, query }: { snapshot: OfflineSnapshot; query: string }) {
  const normalized = query.trim().toLocaleLowerCase("es-MX");
  const collections = [
    { title: "Cuentas", items: snapshot.accounts as any[], amount: (item: any) => formatOfflineMoney(item.currentValueCents, item.currency), detail: (item: any) => item.type ?? "Cuenta" },
    { title: "Tarjetas", items: snapshot.creditCards as any[], amount: (item: any) => formatOfflineMoney(item.currentBalanceCents ?? item.balanceCents ?? item.usedCents, item.currency), detail: (item: any) => item.cardKind ?? "Tarjeta" },
    { title: "Deudas", items: snapshot.debts as any[], amount: (item: any) => formatOfflineMoney(item.balanceCents, item.currency), detail: (item: any) => item.nextDueAt ? `Próximo pago: ${new Date(item.nextDueAt).toLocaleDateString("es-MX")}` : item.type ?? "Deuda" },
    { title: "Presupuestos", items: snapshot.budgets as any[], amount: (item: any) => formatOfflineMoney(item.plannedCents, "MXN"), detail: (item: any) => item.periodStart ? new Date(item.periodStart).toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : item.type ?? "Presupuesto" },
    { title: "Inversiones", items: snapshot.investments as any[], amount: (item: any) => formatOfflineMoney(item.currentValueCents, item.currency), detail: (item: any) => item.institution ?? item.type ?? "Inversión" },
    { title: "Objetivos", items: snapshot.goals as any[], amount: (item: any) => formatOfflineMoney(item.targetAmountCents, item.currency), detail: (item: any) => item.status ?? "Objetivo" },
    { title: "Tareas", items: snapshot.tasks as any[], amount: () => "Solo lectura", detail: (item: any) => item.status ?? item.priority ?? "Tarea" },
    { title: "Viajes", items: snapshot.travelPlans as any[], amount: () => "Solo lectura", detail: (item: any) => item.startsAt ? new Date(item.startsAt).toLocaleDateString("es-MX") : item.status ?? "Viaje" },
    { title: "Calendario", items: snapshot.calendarEvents as any[], amount: (item: any) => item.startsAt ? new Date(item.startsAt).toLocaleDateString("es-MX") : "Sin fecha", detail: (item: any) => item.eventType ?? "Evento" },
    { title: "Estados", items: snapshot.statements as any[], amount: () => "Solo lectura", detail: (item: any) => item.periodStart ? new Date(item.periodStart).toLocaleDateString("es-MX", { month: "short", year: "numeric" }) : item.type ?? "Estado" },
    { title: "Libro PFAE", items: snapshot.fiscalRecords as any[], amount: (item: any) => formatOfflineMoney(item.amountCents, item.currency), detail: (item: any) => item.reviewStatus ?? "Registro fiscal" },
    { title: "Documentos", items: snapshot.documents as any[], amount: () => "Metadato", detail: (item: any) => item.documentType ?? item.status ?? "Documento" },
  ];
  return <section id="offline-collections" className="mt-6 grid gap-4 lg:grid-cols-2">{collections.map(collection => { const items = collection.items.filter(item => !normalized || haystack(item, collection.title.slice(0, -1)).includes(normalized)); return <details className="rounded-2xl border bg-background p-4 sm:p-5" key={collection.title}><summary className="cursor-pointer list-none font-semibold">{collection.title} <span className="ml-2 text-xs font-normal text-muted-foreground">({items.length}/{collection.items.length})</span></summary><div className="mt-4 divide-y">{items.map(item => <div className="flex items-center justify-between gap-3 py-3 text-sm" key={item.id ?? `${collection.title}-${itemName(item, "sin-id")}`}><div className="min-w-0"><p className="truncate font-medium">{itemName(item, collection.title.slice(0, -1))}</p><p className="mt-0.5 text-xs text-muted-foreground">{collection.detail(item)}</p></div><strong className="shrink-0 text-right">{collection.amount(item)}</strong></div>)}{!items.length ? <p className="py-2 text-sm text-muted-foreground">{normalized ? "Sin coincidencias en esta sección." : "No hay elementos guardados."}</p> : null}</div></details>; })}</section>;
}
