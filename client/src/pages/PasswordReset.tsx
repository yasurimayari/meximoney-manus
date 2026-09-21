import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function PasswordReset() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [requested, setRequested] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: response => { setRequested(true); setDeliveryMessage(response.message); toast.success(response.message); },
    onError: error => toast.error(error.message),
  });
  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => { toast.success("Contraseña actualizada. Ya puedes iniciar sesión."); window.location.assign("/"); },
    onError: error => toast.error(error.message),
  });
  const submitRequest = (event: FormEvent) => { event.preventDefault(); requestReset.mutate({ email }); };
  const submitReset = (event: FormEvent) => { event.preventDefault(); if (password !== confirmation) return toast.error("Las contraseñas no coinciden."); resetPassword.mutate({ token, password }); };
  const resetting = Boolean(token);
  return <div className="auth-gate"><div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" /><div className="auth-shell"><section className="auth-intro"><div className="auth-wordmark"><span className="auth-logo">M</span><span>Richeon</span></div><p className="eyebrow">Acceso protegido · recuperación segura</p><h1>{resetting ? "Crea una contraseña nueva" : "Recupera el acceso a tu espacio"}</h1><p>{resetting ? "Elige una contraseña nueva y privada. El enlace de seguridad sólo puede usarse una vez." : "El enlace será de un solo uso y vencerá en 30 minutos. Por seguridad, no confirmamos si ese correo tiene una cuenta."}</p></section><section className="auth-card"><div className="auth-card-icon"><ShieldCheck className="size-5" /></div><p className="auth-card-kicker">Recuperación de contraseña</p><h2>{resetting ? "Restablece tu contraseña" : "¿Olvidaste tu contraseña?"}</h2>{!resetting && requested ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">{deliveryMessage}</div> : resetting ? <form className="auth-form mt-5" onSubmit={submitReset}><div className="form-field"><Label htmlFor="reset-password">Contraseña nueva</Label><Input id="reset-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} /><small>Usa al menos 12 caracteres.</small></div><div className="form-field"><Label htmlFor="reset-confirmation">Confirma la contraseña</Label><Input id="reset-confirmation" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div><Button type="submit" size="lg" className="w-full btn-primary" disabled={resetPassword.isPending}>{resetPassword.isPending ? "Actualizando…" : "Guardar contraseña nueva"}</Button></form> : <form className="auth-form mt-5" onSubmit={submitRequest}><div className="form-field"><Label htmlFor="reset-email">Correo electrónico</Label><Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div><Button type="submit" size="lg" className="w-full btn-primary" disabled={requestReset.isPending}>{requestReset.isPending ? "Comprobando…" : "Continuar con recuperación"}</Button></form>}<p className="mt-5 text-center text-sm text-muted-foreground"><a href="/" className="font-semibold text-primary underline-offset-4 hover:underline">Volver a iniciar sesión</a></p></section></div></div>;
}
