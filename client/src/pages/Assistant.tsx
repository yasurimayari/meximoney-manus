import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { trpc } from "@/lib/trpc";
import { BookOpen, Calculator, CircleAlert, Database, Eye, History, LockKeyhole, Plus, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const suggestedPrompts = [
  "Resume mi situación financiera actual y cita tus fuentes.",
  "¿Qué información falta para hacer un cierre mensual fiable?",
  "Explica con fórmula cómo se calcula mi flujo neto y mi liquidez.",
  "Sugiere tres revisiones prioritarias sin ejecutar ninguna acción.",
];

type NoteDraft = { id?: number; title: string; content: string };

export default function Assistant() {
  const { data, isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const notes = trpc.finance.assistant.notes.list.useQuery();
  const history = trpc.finance.assistant.history.list.useQuery();
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<Message[]>([]);
  const [note, setNote] = useState<NoteDraft>({ title: "Nota sin título", content: "" });
  const [previewNote, setPreviewNote] = useState(false);
  const chat = trpc.finance.assistant.chat.useMutation({
    onSuccess: response => {
      setMessages(previous => [...previous, { role: "assistant", content: response.content }]);
      void history.refetch();
    },
    onError: error => {
      toast.error(error.message);
      setMessages(previous => [...previous, { role: "assistant", content: "No pude preparar el análisis. Verifica que el registro manual esté completo e inténtalo de nuevo." }]);
    },
  });
  const saveNote = trpc.finance.assistant.notes.save.useMutation({
    onSuccess: response => {
      toast.success("Nota guardada");
      setNote(current => ({ ...current, id: response.id }));
      void utils.finance.assistant.notes.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const removeNote = trpc.finance.assistant.notes.remove.useMutation({
    onSuccess: () => {
      toast.success("Nota eliminada");
      setNote({ title: "Nota sin título", content: "" });
      void utils.finance.assistant.notes.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!note.id && notes.data?.[0]) {
      const first = notes.data[0];
      setNote({ id: first.id, title: first.title, content: first.content });
    }
  }, [notes.data, note.id]);

  const send = (content: string) => {
    setMessages(previous => [...previous, { role: "user", content }]);
    chat.mutate({ message: content });
  };

  const selectNote = (selected: NoteDraft) => {
    setNote(selected);
    setPreviewNote(false);
  };

  const selectHistory = (item: { userMessage: string; assistantContent: string }) => {
    setMessages([{ role: "user", content: item.userMessage }, { role: "assistant", content: item.assistantContent }]);
    toast.success("Consulta recuperada");
  };

  if (isLoading || !data) return <div className="page-loading">Cargando el contexto manual del asistente…</div>;

  return (
    <div className="assistant-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Mexi IA · asistente privado</p>
          <h1>Entiende tus finanzas con trazabilidad.</h1>
          <p>Analiza tus registros manuales mediante Claude, conserva tus consultas y te permite desarrollar ideas en un diario privado. No busca en internet ni ejecuta acciones financieras.</p>
        </div>
      </header>
      <div className="assistant-layout">
        <section className="assistant-chat-card">
          <div className="assistant-chat-header">
            <div className="assistant-avatar"><Sparkles className="size-4" /></div>
            <div><strong>Mexi IA · análisis explicable con Claude</strong><span>Solo lectura · Markdown y fórmulas visibles</span></div>
          </div>
          <AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="610px" placeholder="Pregunta sobre tus datos manuales…" emptyStateMessage="Mexi IA está lista para revisar tus registros manuales con Claude." suggestedPrompts={suggestedPrompts} className="assistant-chat" />
        </section>

        <aside className="assistant-sidebar">
          <section className="assistant-context assistant-notebook">
            <div className="assistant-section-heading"><div className="assistant-context-icon"><BookOpen className="size-5" /></div><div><h2>Diario financiero</h2><p>Anota ideas, decisiones y preguntas para revisarlas después.</p></div></div>
            <div className="assistant-note-actions"><Button type="button" variant="outline" size="sm" onClick={() => { setNote({ title: "Nota sin título", content: "" }); setPreviewNote(false); }}><Plus className="mr-1 size-3.5" />Nueva</Button><Button type="button" size="sm" onClick={() => saveNote.mutate(note)} disabled={saveNote.isPending || !note.title.trim()}><Save className="mr-1 size-3.5" />Guardar</Button></div>
            <Input value={note.title} onChange={event => setNote(current => ({ ...current, title: event.target.value }))} maxLength={180} placeholder="Título de la nota" aria-label="Título de la nota" />
            <div className="assistant-note-tabs"><button type="button" className={!previewNote ? "active" : ""} onClick={() => setPreviewNote(false)}>Editar</button><button type="button" className={previewNote ? "active" : ""} onClick={() => setPreviewNote(true)}><Eye className="mr-1 inline size-3.5" />Vista previa</button></div>
            {previewNote ? <div className="assistant-note-preview prose prose-sm max-w-none"><Streamdown>{note.content || "Escribe una nota para verla aquí."}</Streamdown></div> : <Textarea value={note.content} onChange={event => setNote(current => ({ ...current, content: event.target.value }))} maxLength={20000} placeholder="Escribe tus ideas en Markdown… Puedes usar $x^2$ o $$\\frac{ingresos-gastos}{ingresos}$$" className="min-h-28 resize-y" aria-label="Contenido de la nota" />}
            {note.id && <Button type="button" variant="ghost" size="sm" className="mt-1 self-end text-destructive hover:text-destructive" onClick={() => removeNote.mutate({ id: note.id! })} disabled={removeNote.isPending}><Trash2 className="mr-1 size-3.5" />Eliminar nota</Button>}
            <div className="assistant-note-list">{notes.data?.map(item => <button type="button" key={item.id} className={note.id === item.id ? "selected" : ""} onClick={() => selectNote({ id: item.id, title: item.title, content: item.content })}><span>{item.title}</span><small>{new Date(item.updatedAt).toLocaleDateString("es-MX")}</small></button>)}</div>
          </section>

          <section className="assistant-context assistant-history-panel">
            <div className="assistant-section-heading"><div className="assistant-context-icon"><History className="size-5" /></div><div><h2>Historial de chat</h2><p>Recupera consultas y recomendaciones anteriores.</p></div></div>
            <div className="assistant-history-list">{history.data?.length ? history.data.map(item => <button type="button" key={item.id} onClick={() => selectHistory(item)}><strong>{item.userMessage}</strong><small>{new Date(item.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</small><span>{item.assistantContent.slice(0, 120)}{item.assistantContent.length > 120 ? "…" : ""}</span></button>) : <p className="assistant-empty">Tus consultas aparecerán aquí después de la primera respuesta.</p>}</div>
          </section>

          <section className="assistant-context">
            <div className="assistant-context-icon"><Database className="size-5" /></div><h2>Contexto disponible</h2><p>Mexi IA usa una síntesis privada y limitada de tus registros. La clave nunca llega al navegador.</p>
            <div className="context-stat"><span>Movimientos</span><strong>{data.transactions.length}</strong></div><div className="context-stat"><span>Cuentas y activos</span><strong>{data.accounts.length}</strong></div><div className="context-stat"><span>Deudas activas</span><strong>{data.debts.filter(item => item.status !== "paid").length}</strong></div><div className="context-stat"><span>Objetivos activos</span><strong>{data.goals.filter(item => item.status === "active").length}</strong></div>
          </section>
          <section className="assistant-context assistant-safety"><ShieldCheck className="size-5" /><h2>Límites de seguridad</h2><ul><li>No usa datos externos ni precios actuales.</li><li>No ejecuta pagos, transferencias ni inversiones.</li><li>Expone datos utilizados, fórmulas, supuestos y fuentes.</li><li>Las recomendaciones son manuales y no cambian tus datos.</li></ul></section>
          <section className="assistant-context"><Calculator className="size-5 text-primary" /><h2>Cómo responde</h2><p>Las respuestas aceptan Markdown y fórmulas LaTeX, por ejemplo <code>$ingresos - gastos$</code> o un bloque como <code>$$\\text&#123;Flujo neto&#125; = ingresos - gastos$$</code>.</p></section>
          <section className="assistant-context assistant-alert"><CircleAlert className="size-5" /><h2>Nota importante</h2><p>Las respuestas son educativas y organizativas. Para decisiones fiscales, legales o de inversión complejas, valida con un profesional.</p></section>
        </aside>
      </div>
    </div>
  );
}
