import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ChangePassword() {
  const utils = trpc.useUtils();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [completed, setCompleted] = useState(false);
  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setCompleted(true);
      await utils.auth.securityStatus.invalidate();
      toast.success("Contraseña actualizada. Las solicitudes de recuperación anteriores dejaron de ser válidas.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 12) return toast.error("La nueva contraseña debe tener al menos 12 caracteres.");
    if (newPassword !== confirmation) return toast.error("La confirmación no coincide con la nueva contraseña.");
    if (newPassword === currentPassword) return toast.error("La nueva contraseña debe ser distinta de la actual.");
    mutation.mutate({ currentPassword, newPassword });
  };

  return <div className="mx-auto max-w-2xl space-y-7">
    <header className="page-heading">
      <div>
        <p className="eyebrow">Seguridad de acceso</p>
        <h1>Cambia tu contraseña.</h1>
        <p>Esta acción requiere tu sesión actual y la contraseña vigente. No cambia tu correo ni modifica información financiera.</p>
      </div>
    </header>
    <section className="content-card overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-start">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-6" /></div>
        <div className="min-w-0"><h2 className="text-lg font-semibold">Cambio protegido por tu sesión</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Al confirmar, Meximoney verifica tu contraseña actual, invalida solicitudes de recuperación anteriores y registra sólo el evento privado mínimo.</p></div>
      </div>
      {completed ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><strong>Contraseña actualizada</strong><p className="mt-1 text-sm leading-6">Tu sesión actual sigue abierta. Puedes revisar el estado de seguridad sin que se muestren datos sensibles.</p><Link href="/calidad" className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4">Volver a Calidad, perfil y privacidad</Link></div></div></div> : <form className="mt-6 space-y-5" onSubmit={submit}>
        <div className="form-field"><Label htmlFor="current-password">Contraseña actual</Label><Input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div>
        <div className="form-field"><Label htmlFor="new-password">Nueva contraseña</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={event => setNewPassword(event.target.value)} /><small>Usa al menos 12 caracteres y no reutilices la contraseña actual.</small></div>
        <div className="form-field"><Label htmlFor="confirm-password">Confirmar nueva contraseña</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
        <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" /><span>Meximoney no muestra ni conserva la contraseña en el historial de seguridad. Las solicitudes de recuperación pendientes se invalidarán al completar este cambio.</span></div>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Actualizando…" : "Actualizar contraseña"}</Button><Link href="/calidad"><Button type="button" variant="outline">Cancelar</Button></Link></div>
      </form>}
    </section>
  </div>;
}
