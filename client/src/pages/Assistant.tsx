import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { trpc } from "@/lib/trpc";
import { BookOpen, Eye, History, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const suggestedPrompts = [
  "Resume mi situación financiera actual y cita tus fuentes.",
  "¿Qué información falta para hacer un cierre mensual fiable?",
  "Explica con fórmula cómo se calcula mi flujo neto y mi liquidez.",
  "Sugiere tres revisiones prioritarias sin ejecutar ninguna acción.",
];

const noteTags = [
  { value: "general", label: "General", color: "slate" },
  { value: "impuestos", label: "Impuestos", color: "amber" },
  { value: "inversiones", label: "Inversiones", color: "emerald" },
  { value: "presupuesto", label: "Presupuesto", color: "blue" },
  { value: "deudas", label: "Deudas", color: "rose" },
  { value: "patrimonio", label: "Patrimonio", color: "violet" },
  { value: "proyectos", label: "Proyectos", color: "blue" },
  { value: "personal", label: "Personal", color: "slate" },
] as const;
const noteColors = ["slate", "blue", "amber", "emerald", "violet", "rose"] as const;
type NoteTag = (typeof noteTags)[number]["value"];
type NoteColor = (typeof noteColors)[number];
type NoteDraft = { id?: number; title: string; content: string; tag: NoteTag; tagColor: NoteColor };

export default function Assistant() {
  const { isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const notes = trpc.finance.assistant.notes.list.useQuery();
  const history = trpc.finance.assistant.history.list.useQuery();
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedNoteTag, setSelectedNoteTag] = useState<NoteTag | "all">("all");
  const [noteListFilter, setNoteListFilter] = useState<NoteTag | "all">("all");
  const [note, setNote] = useState<NoteDraft>({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate" });
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
      setNote({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate" });
      void utils.finance.assistant.notes.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!note.id && notes.data?.[0]) {
      const first = notes.data[0];
      setNote({ id: first.id, title: first.title, content: first.content, tag: (first.tag as NoteTag) || "general", tagColor: (first.tagColor as NoteColor) || "slate" });
    }
  }, [notes.data, note.id]);

  const send = (content: string) => {
    setMessages(previous => [...previous, { role: "user", content }]);
    chat.mutate({ message: content, noteTag: selectedNoteTag === "all" ? undefined : selectedNoteTag });
  };

  const selectNote = (selected: NoteDraft) => {
    setNote(selected);
    setPreviewNote(false);
  };

  const visibleNotes = notes.data?.filter(item => noteListFilter === "all" || item.tag === noteListFilter) ?? [];
  const tagLabel = (tag: string) => noteTags.find(item => item.value === tag)?.label ?? "General";

  const selectHistory = (item: { userMessage: string; assistantContent: string }) => {
    setMessages([{ role: "user", content: item.userMessage }, { role: "assistant", content: item.assistantContent }]);
    toast.success("Consulta recuperada");
  };

  if (isLoading) return <div className="page-loading">Cargando el contexto manual del asistente…</div>;

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
            <label className="assistant-context-filter"><span>Notas para Mexi IA</span><select value={selectedNoteTag} onChange={event => setSelectedNoteTag(event.target.value as NoteTag | "all")} aria-label="Filtrar notas para Mexi IA"><option value="all">Todas las etiquetas</option>{noteTags.map(tag => <option value={tag.value} key={tag.value}>{tag.label}</option>)}</select></label>
          </div>
          <AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="610px" placeholder="Pregunta sobre tus datos manuales…" emptyStateMessage="Mexi IA está lista para revisar tus registros manuales con Claude." suggestedPrompts={suggestedPrompts} className="assistant-chat" />
        </section>

        <aside className="assistant-sidebar">
          <section className="assistant-context assistant-notebook">
            <div className="assistant-section-heading"><div className="assistant-context-icon"><BookOpen className="size-5" /></div><div><h2>Diario financiero</h2><p>Anota ideas, decisiones y preguntas para revisarlas después.</p></div></div>
            <div className="assistant-note-actions"><Button type="button" variant="outline" size="sm" onClick={() => { setNote({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate" }); setPreviewNote(false); }}><Plus className="mr-1 size-3.5" />Nueva</Button><Button type="button" size="sm" onClick={() => saveNote.mutate(note)} disabled={saveNote.isPending || !note.title.trim()}><Save className="mr-1 size-3.5" />Guardar</Button></div>
            <Input value={note.title} onChange={event => setNote(current => ({ ...current, title: event.target.value }))} maxLength={180} placeholder="Título de la nota" aria-label="Título de la nota" />
            <div className="assistant-note-meta"><label>Etiqueta<select value={note.tag} onChange={event => setNote(current => ({ ...current, tag: event.target.value as NoteTag }))} aria-label="Etiqueta de la nota">{noteTags.map(tag => <option value={tag.value} key={tag.value}>{tag.label}</option>)}</select></label><div><span>Color</span><div className="assistant-color-picker">{noteColors.map(color => <button type="button" key={color} aria-label={`Color ${color}`} className={`note-color-swatch note-color-${color} ${note.tagColor === color ? "selected" : ""}`} onClick={() => setNote(current => ({ ...current, tagColor: color }))} />)}</div></div></div>
            <div className="assistant-note-tabs"><button type="button" className={!previewNote ? "active" : ""} onClick={() => setPreviewNote(false)}>Editar</button><button type="button" className={previewNote ? "active" : ""} onClick={() => setPreviewNote(true)}><Eye className="mr-1 inline size-3.5" />Vista previa</button></div>
            {previewNote ? <div className="assistant-note-preview prose prose-sm max-w-none"><Streamdown>{note.content || "Escribe una nota para verla aquí."}</Streamdown></div> : <Textarea value={note.content} onChange={event => setNote(current => ({ ...current, content: event.target.value }))} maxLength={20000} placeholder="Escribe tus ideas y apuntes aquí…" className="min-h-28 resize-y" aria-label="Contenido de la nota" />}
            <div className="assistant-note-list-toolbar"><select value={noteListFilter} onChange={event => setNoteListFilter(event.target.value as NoteTag | "all")} aria-label="Filtrar notas por etiqueta"><option value="all">Todas las etiquetas</option>{noteTags.map(tag => <option value={tag.value} key={tag.value}>{tag.label}</option>)}</select></div>
            {note.id && <Button type="button" variant="ghost" size="sm" className="mt-1 self-end text-destructive hover:text-destructive" onClick={() => removeNote.mutate({ id: note.id! })} disabled={removeNote.isPending}><Trash2 className="mr-1 size-3.5" />Eliminar nota</Button>}
            <div className="assistant-note-list">{visibleNotes.map(item => <button type="button" key={item.id} className={note.id === item.id ? "selected" : ""} onClick={() => selectNote({ id: item.id, title: item.title, content: item.content, tag: (item.tag as NoteTag) || "general", tagColor: (item.tagColor as NoteColor) || "slate" })}><span>{item.title}</span><small><b className={`note-tag note-tag-${item.tagColor}`}>{tagLabel(item.tag)}</b> · {new Date(item.updatedAt).toLocaleDateString("es-MX")}</small></button>)}</div>
          </section>

          <section className="assistant-context assistant-history-panel">
            <div className="assistant-section-heading"><div className="assistant-context-icon"><History className="size-5" /></div><div><h2>Historial de chat</h2><p>Recupera consultas y recomendaciones anteriores.</p></div></div>
            <div className="assistant-history-list">{history.data?.length ? history.data.map(item => <button type="button" key={item.id} onClick={() => selectHistory(item)}><strong>{item.userMessage}</strong><small>{new Date(item.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</small><span>{item.assistantContent.slice(0, 120)}{item.assistantContent.length > 120 ? "…" : ""}</span></button>) : <p className="assistant-empty">Tus consultas aparecerán aquí después de la primera respuesta.</p>}</div>
          </section>

        </aside>
      </div>
    </div>
  );
}
