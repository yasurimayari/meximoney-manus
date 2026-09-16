import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { clearOfflineVault, getOfflineVaultSummary, saveOfflineSnapshot, type OfflineSnapshotSummary } from "@/lib/offlineVault";
import { trpc } from "@/lib/trpc";
import { CloudDownload, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const policyVersion = "2026-08-offline-vault";

export default function OfflineData() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const utils = trpc.useUtils();
  const consent = trpc.finance.privacy.recordOfflineVaultConsent.useMutation({ onSuccess: () => utils.finance.privacy.listConsents.invalidate() });
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [summary, setSummary] = useState<OfflineSnapshotSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshSummary = () => getOfflineVaultSummary().then(setSummary).catch(() => setSummary(null));
  useEffect(() => { refreshSummary(); }, []);

  const save = async () => {
    if (!data) return;
    if (!accepted) return toast.error("Confirma que deseas guardar una copia cifrada en este dispositivo.");
    if (pin.length < 8) return toast.error("Usa un código local de al menos 8 caracteres.");
    if (pin !== confirmation) return toast.error("Los dos campos del código local no coinciden.");
    setSaving(true);
    try {
      const saved = await saveOfflineSnapshot(data, pin);
      await consent.mutateAsync({ accepted: true, policyVersion });
      setPin(""); setConfirmation(""); setSummary(saved);
      toast.success("Copia offline cifrada y actualizada en este dispositivo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar la copia offline.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("¿Eliminar la copia offline cifrada de este dispositivo? No se borrará ningún dato de Meximoney en línea.")) return;
    await clearOfflineVault();
    await consent.mutateAsync({ accepted: false, policyVersion });
    setSummary(null);
    toast.success("La copia offline de este dispositivo fue eliminada.");
  };

  if (isLoading || !data) return <div className="page-loading">Preparando la bóveda offline personal…</div>;
  return <div className="space-y-7"><header className="page-heading"><div><p className="eyebrow">PWA personal</p><h1>Tus datos, disponibles con control.</h1><p>Guarda una copia cifrada de tu información financiera en este dispositivo para consultarla cuando no haya Internet.</p></div></header><section className="content-card"><div className="card-title-row"><div><h2>Bóveda offline cifrada</h2><p>Incluye cuentas, tarjetas, deudas, movimientos, presupuestos, inversiones, objetivos, tareas, viajes, calendario, estados y metadatos documentales. Excluye contraseñas, sesiones, correo, fecha de nacimiento, foto, archivos y enlaces de documentos.</p></div><span className="workspace-role"><LockKeyhole className="size-4" /> Uso personal</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><OfflineStat label="Movimientos" value={summary?.transactions ?? 0} /><OfflineStat label="Cuentas y tarjetas" value={(summary?.accounts ?? 0) + (summary?.creditCards ?? 0)} /><OfflineStat label="Tareas" value={summary?.tasks ?? 0} /><OfflineStat label="Viajes" value={summary?.travelPlans ?? 0} /></div>{summary ? <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 text-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-semibold">Copia local cifrada disponible</p><p className="mt-1 text-muted-foreground">Última actualización: {new Date(summary.cachedAt).toLocaleString("es-MX")}. Para renovarla, confirma nuevamente tu código local. La aplicación no sincroniza altas, cambios, pagos ni transferencias de forma automática.</p></div></div></div> : null}<div className="mt-6 grid gap-4 rounded-2xl border bg-muted/20 p-5 md:grid-cols-2"><div className="form-field"><Label htmlFor="offline-pin">Código local de desbloqueo</Label><Input id="offline-pin" type="password" autoComplete="new-password" minLength={8} value={pin} onChange={event => setPin(event.target.value)} placeholder="Al menos 8 caracteres" /><small>No se envía al servidor ni se guarda. Si lo olvidas, elimina la copia y crea una nueva al estar en línea.</small></div><div className="form-field"><Label htmlFor="offline-pin-confirm">Repite el código local</Label><Input id="offline-pin-confirm" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Repite el código" /></div><label className="md:col-span-2 flex items-start gap-3 rounded-xl bg-background p-4 text-xs leading-5"><input className="mt-0.5 size-4 accent-primary" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>Entiendo que esta copia contiene mis datos financieros cifrados en este dispositivo personal. Sé que debo proteger mi equipo y que puedo eliminar la copia desde esta pantalla o mediante el borrado completo de datos.</span></label><div className="md:col-span-2 flex flex-wrap gap-3"><Button type="button" disabled={saving || consent.isPending} onClick={save}><CloudDownload className="size-4" /> {saving ? "Protegiendo copia…" : summary ? "Actualizar copia cifrada" : "Guardar copia cifrada"}</Button>{summary ? <Button type="button" variant="outline" disabled={saving || consent.isPending} onClick={remove}><Trash2 className="size-4" /> Eliminar copia de este dispositivo</Button> : null}</div></div></section><section className="content-card"><div className="card-title-row"><div><h2>Cómo funciona sin conexión</h2><p>La instalación abre una vista local bloqueada con tu código. Puedes buscar y consultar la copia cifrada, pero cualquier alta, edición, exportación, pago, inversión o transferencia seguirá requiriendo conexión y una acción tuya.</p></div><RefreshCw className="size-5 text-primary" /></div></section></div>;
}

function OfflineStat({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border bg-background p-4"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></article>;
}
