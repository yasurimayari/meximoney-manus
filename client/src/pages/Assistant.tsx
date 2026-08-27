import { AIChatBox, type Message } from "@/components/AIChatBox";
import { formatMoney } from "@/lib/finance";
import { trpc } from "@/lib/trpc";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { BotMessageSquare, CircleAlert, Database, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const suggestedPrompts = [
  "Resume mi situación financiera actual con los datos disponibles.",
  "¿Qué información falta para hacer un cierre mensual fiable?",
  "Explica cómo se calcula mi flujo neto y mi liquidez.",
  "Prepara una recomendación de revisión mensual sin tomar ninguna acción.",
];

export default function Assistant() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const [messages, setMessages] = useState<Message[]>([]);
  const chat = trpc.finance.assistant.chat.useMutation({
    onSuccess: response => setMessages(previous => [...previous, { role: "assistant", content: response.content }]),
    onError: error => { toast.error(error.message); setMessages(previous => [...previous, { role: "assistant", content: "No pude preparar el análisis. Verifica que el registro manual esté completo e inténtalo de nuevo." }]); },
  });
  const send = (content: string) => { setMessages(previous => [...previous, { role: "user", content }]); chat.mutate({ message: content }); };
  if (isLoading || !data) return <div className="page-loading">Cargando el contexto manual del asistente…</div>;
  const currency = data.profile?.currency ?? "MXN";
  return <div className="assistant-page"><header className="page-heading"><div><p className="eyebrow">Asistente privado</p><h1>Habla con Mexi.</h1><p>Analiza exclusivamente la información que has registrado en Meximoney mediante Claude. No busca en internet, no consulta bancos y no realiza acciones financieras.</p></div></header><div className="assistant-layout"><section className="assistant-chat-card"><div className="assistant-chat-header"><div className="assistant-avatar"><Sparkles className="size-4" /></div><div><strong>Mexi · análisis explicable con Claude</strong><span>Solo registros manuales</span></div></div><AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="610px" placeholder="Pregunta sobre tus datos manuales…" emptyStateMessage="Mexi está listo para revisar tus registros manuales con Claude." suggestedPrompts={suggestedPrompts} className="assistant-chat" /></section><aside className="assistant-sidebar"><section className="assistant-context"><div className="assistant-context-icon"><Database className="size-5" /></div><h2>Contexto disponible</h2><p>Para responder, Mexi envía desde el servidor a Claude una síntesis de estos registros manuales. La clave nunca llega al navegador.</p><div className="context-stat"><span>Movimientos</span><strong>{data.transactions.length}</strong></div><div className="context-stat"><span>Cuentas y activos</span><strong>{data.accounts.length}</strong></div><div className="context-stat"><span>Deudas activas</span><strong>{data.debts.filter(item => item.status !== "paid").length}</strong></div><div className="context-stat"><span>Objetivos activos</span><strong>{data.goals.filter(item => item.status === "active").length}</strong></div></section><section className="assistant-context assistant-safety"><LockKeyhole className="size-5" /><h2>Límites de seguridad</h2><ul><li>No usa datos externos ni precios actuales.</li><li>No ejecuta pagos, transferencias ni inversiones.</li><li>Indica datos faltantes y supuestos antes de recomendar.</li><li>Registra acciones solo si tú lo haces en Meximoney.</li></ul></section><section className="assistant-context assistant-alert"><CircleAlert className="size-5" /><h2>Nota importante</h2><p>Las respuestas son educativas y organizativas. Para decisiones fiscales, legales o de inversión complejas, valida con un profesional.</p></section></aside></div></div>;
}
