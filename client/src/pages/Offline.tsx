import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockOfflineSnapshot, type OfflineSnapshot } from "@/lib/offlineVault";
import { ChevronLeft, ChevronRight, CloudOff, LockKeyhole, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const OFFLINE_PAGE_SIZE = 20;

function formatOfflineMoney(value: unknown, currency = "MXN") {
  return typeof value === "number" ? new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value / 100) : "—";
}

function itemName(item: any, fallback: string) {
  return item.name ?? item.title ?? item.description ?? item.creditor ?? fallback;
}

export default function Offline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pin, setPin] = useState("");
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => { setTransactionPage(1); }, [snapshot?.cachedAt]);

  const unlock = async () => {
    setUnlocking(true);
    try { setSnapshot(await unlockOfflineSnapshot(pin)); setPin(""); } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible abrir la copia offline."); } finally { setUnlocking(false); }
  };

  const transactions = (snapshot?.transactions ?? []) as any[];
  const totalTransactionPages = Math.max(1, Math.ceil(transactions.length / OFFLINE_PAGE_SIZE));
  const visibleTransactions = transactions.slice((transactionPage - 1) * OFFLINE_PAGE_SIZE, transactionPage * OFFLINE_PAGE_SIZE);

  if (!snapshot) return <main className="offline-shell"><section className="offline-card"><div className="offline-mark">M</div><p className="eyebrow">Meximoney personal</p><h1>Tu copia offline está protegida.</h1><p>Introduce el código local que definiste en este dispositivo. No se enviará a Internet.</p><div className="form-field mt-6"><label htmlFor="offline-unlock">Código local</label><Input id="offline-unlock" type="password" autoComplete="current-password" minLength={8} value={pin} onChange={event => setPin(event.target.value)} onKeyDown={event => event.key === "Enter" && unlock()} /></div><Button className="mt-5 w-full" disabled={unlocking || !pin} onClick={unlock}><LockKeyhole className="size-4" /> {unlocking ? "Desbloqueando…" : "Abrir copia offline"}</Button><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-1">{online ? <Wifi className="size-3" /> : <CloudOff className="size-3" />}{online ? "Con conexión" : "Sin conexión"}</span><a className="font-semibold text-primary hover:underline" href="/">Abrir Meximoney en línea</a></div></section></main>;

  return <main className="offline-shell"><section className="offline-data-shell"><header className="offline-data-header"><div><div className="offline-mark">M</div><p className="eyebrow mt-4">Consulta offline personal</p><h1>Resumen guardado</h1><p>Actualizado el {new Date(snapshot.cachedAt).toLocaleString("es-MX")}. Esta vista es sólo de consulta y no sincroniza cambios.</p></div><div className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Cifrado local</div></header><OfflineOverview snapshot={snapshot} /><section className="mt-6 rounded-2xl border bg-background p-5"><h2 className="font-semibold">Movimientos guardados</h2><p className="mt-1 text-xs text-muted-foreground">Se guardan {transactions.length} movimientos en la copia cifrada. Esta vista no permite registrar, editar, aprobar ni sincronizar.</p><div className="mt-4 divide-y">{visibleTransactions.map(transaction => <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={transaction.id ?? `${transaction.occurredAt}-${transaction.amountCents}`}><div><p className="font-medium">{itemName(transaction, transaction.type ?? "Movimiento")}</p><p className="text-xs text-muted-foreground">{transaction.occurredAt ? new Date(transaction.occurredAt).toLocaleDateString("es-MX") : "Fecha no disponible"} · {transaction.type ?? "Sin tipo"}</p></div><strong>{formatOfflineMoney(transaction.amountCents, transaction.currency)}</strong></div>)}</div>{!transactions.length ? <p className="py-4 text-sm text-muted-foreground">No hay movimientos en la copia local.</p> : null}{transactions.length > OFFLINE_PAGE_SIZE ? <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4"><Button type="button" size="sm" variant="outline" disabled={transactionPage === 1} onClick={() => setTransactionPage(page => Math.max(1, page - 1))}><ChevronLeft className="size-4" /> Anterior</Button><span className="text-xs text-muted-foreground">Página {transactionPage} de {totalTransactionPages}</span><Button type="button" size="sm" variant="outline" disabled={transactionPage === totalTransactionPages} onClick={() => setTransactionPage(page => Math.min(totalTransactionPages, page + 1))}>Siguiente <ChevronRight className="size-4" /></Button></div> : null}</section><OfflineCollections snapshot={snapshot} /><a href="/" className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline">Volver a Meximoney en línea</a></section></main>;
}

function OfflineOverview({ snapshot }: { snapshot: OfflineSnapshot }) {
  const items = useMemo(() => [{ label: "Cuentas", value: snapshot.accounts.length }, { label: "Tarjetas", value: snapshot.creditCards.length }, { label: "Deudas", value: snapshot.debts.length }, { label: "Movimientos", value: snapshot.transactions.length }, { label: "Presupuestos", value: snapshot.budgets.length }, { label: "Inversiones", value: snapshot.investments.length }, { label: "Calendario", value: snapshot.calendarEvents.length }, { label: "Estados", value: snapshot.statements.length }], [snapshot]);
  return <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(item => <article className="rounded-2xl border bg-background p-4" key={item.label}><strong className="text-2xl tabular-nums">{item.value}</strong><p className="mt-1 text-xs text-muted-foreground">{item.label}</p></article>)}</section>;
}

function OfflineCollections({ snapshot }: { snapshot: OfflineSnapshot }) {
  const collections = [
    { title: "Cuentas", items: snapshot.accounts as any[], amount: (item: any) => formatOfflineMoney(item.currentValueCents, item.currency), detail: (item: any) => item.type ?? "Cuenta" },
    { title: "Tarjetas", items: snapshot.creditCards as any[], amount: (item: any) => formatOfflineMoney(item.currentBalanceCents ?? item.balanceCents ?? item.usedCents, item.currency), detail: (item: any) => item.cardKind ?? "Tarjeta" },
    { title: "Deudas", items: snapshot.debts as any[], amount: (item: any) => formatOfflineMoney(item.balanceCents, item.currency), detail: (item: any) => item.nextDueAt ? `Próximo pago: ${new Date(item.nextDueAt).toLocaleDateString("es-MX")}` : item.type ?? "Deuda" },
    { title: "Presupuestos", items: snapshot.budgets as any[], amount: (item: any) => formatOfflineMoney(item.plannedCents, "MXN"), detail: (item: any) => item.periodStart ? new Date(item.periodStart).toLocaleDateString("es-MX", { month: "long", year: "numeric" }) : item.type ?? "Presupuesto" },
    { title: "Inversiones", items: snapshot.investments as any[], amount: (item: any) => formatOfflineMoney(item.currentValueCents, item.currency), detail: (item: any) => item.institution ?? item.type ?? "Inversión" },
    { title: "Calendario", items: snapshot.calendarEvents as any[], amount: (item: any) => item.startsAt ? new Date(item.startsAt).toLocaleDateString("es-MX") : "Sin fecha", detail: (item: any) => item.eventType ?? "Evento" },
  ];
  return <section className="mt-6 grid gap-4 lg:grid-cols-2">{collections.map(collection => <details className="rounded-2xl border bg-background p-5" key={collection.title}><summary className="cursor-pointer list-none font-semibold">{collection.title} <span className="ml-2 text-xs font-normal text-muted-foreground">({collection.items.length})</span></summary><div className="mt-4 divide-y">{collection.items.map(item => <div className="flex items-center justify-between gap-3 py-3 text-sm" key={item.id ?? `${collection.title}-${itemName(item, "sin-id")}`}><div className="min-w-0"><p className="truncate font-medium">{itemName(item, collection.title.slice(0, -1))}</p><p className="mt-0.5 text-xs text-muted-foreground">{collection.detail(item)}</p></div><strong className="shrink-0 text-right">{collection.amount(item)}</strong></div>)}{!collection.items.length ? <p className="py-2 text-sm text-muted-foreground">No hay elementos guardados.</p> : null}</div></details>)}</section>;
}
