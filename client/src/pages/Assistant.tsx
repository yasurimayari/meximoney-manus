import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dashboardPeriodQuery } from "@/lib/dashboardPeriod";
import { trpc } from "@/lib/trpc";
import { Archive, BookOpen, Edit3, Eye, FileText, History, Paperclip, Pin, PinOff, Plus, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
type NoteTag = (typeof noteTags)[number]["value"];
type NoteColor = (typeof noteTags)[number]["color"];
type NoteDraft = { id?: number; title: string; content: string; tag: NoteTag; tagColor: NoteColor; isPinned?: boolean };

export default function Assistant() {
  const { isLoading } = trpc.finance.dashboard.useQuery(dashboardPeriodQuery);
  const notes = trpc.finance.assistant.notes.list.useQuery();
  const history = trpc.finance.assistant.history.list.useQuery();
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedNoteTag, setSelectedNoteTag] = useState<NoteTag | "all">("all");
  const [noteListFilter, setNoteListFilter] = useState<NoteTag | "all">("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [note, setNote] = useState<NoteDraft>({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate", isPinned: false });
  const [previewNote, setPreviewNote] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
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
  const handleNoteSaved = (response: { id: number }) => {
    toast.success("Nota guardada");
    setNote(current => ({ ...current, id: response.id }));
    setIsCreatingNote(false);
    setNoteSearch("");
    void utils.finance.assistant.notes.list.invalidate();
  };
  const createNote = trpc.finance.assistant.notes.create.useMutation({ onSuccess: handleNoteSaved, onError: error => toast.error(error.message) });
  const saveNote = trpc.finance.assistant.notes.save.useMutation({ onSuccess: handleNoteSaved, onError: error => toast.error(error.message) });
  const togglePinned = trpc.finance.assistant.notes.togglePinned.useMutation({
    onSuccess: () => { toast.success("Prioridad de la nota actualizada"); void utils.finance.assistant.notes.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const archiveNote = trpc.finance.assistant.notes.archive.useMutation({
    onSuccess: () => {       toast.success("Nota archivada"); setIsCreatingNote(true); setNote({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate", isPinned: false }); void utils.finance.assistant.notes.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const uploadAttachment = trpc.finance.assistant.notes.attachments.upload.useMutation({
    onSuccess: () => { toast.success("Adjunto guardado"); void utils.finance.assistant.notes.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const removeAttachment = trpc.finance.assistant.notes.attachments.remove.useMutation({
    onSuccess: () => { toast.success("Adjunto eliminado"); void utils.finance.assistant.notes.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const removeNote = trpc.finance.assistant.notes.remove.useMutation({
    onSuccess: () => {
      toast.success("Nota eliminada");
      setIsCreatingNote(true);
      setNote({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate", isPinned: false });
      void utils.finance.assistant.notes.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!isCreatingNote && !note.id && notes.data?.[0]) {
      const first = notes.data[0];
      setNote({ id: first.id, title: first.title, content: first.content, tag: (first.tag as NoteTag) || "general", tagColor: (first.tagColor as NoteColor) || "slate", isPinned: Boolean(first.isPinned) });
    }
  }, [notes.data, note.id, isCreatingNote]);

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!note.id) { toast.error("Guarda la nota antes de adjuntar un archivo."); return; }
    for (const file of files) {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("No se pudo leer el archivo.")); reader.readAsDataURL(file); });
      uploadAttachment.mutate({ noteId: note.id, fileName: file.name, mimeType: file.type, base64 });
    }
  };

  const send = (content: string) => {
    setMessages(previous => [...previous, { role: "user", content }]);
    chat.mutate({ message: content, noteTag: selectedNoteTag === "all" ? undefined : selectedNoteTag });
  };

  const selectNote = (selected: NoteDraft) => {
    setIsCreatingNote(false);
    setNote(selected);
    setPreviewNote(false);
  };

  const noteAttachments = note.id ? notes.data?.find(item => item.id === note.id)?.attachments ?? [] : [];
  const visibleNotes = notes.data?.filter(item => {
    const matchesTag = noteListFilter === "all" || item.tag === noteListFilter;
    const query = noteSearch.trim().toLocaleLowerCase("es-MX");
    const matchesSearch = !query || `${item.title} ${item.content}`.toLocaleLowerCase("es-MX").includes(query);
    return matchesTag && matchesSearch;
  }) ?? [];
  const tagLabel = (tag: string) => noteTags.find(item => item.value === tag)?.label ?? "General";
  const tagColor = (tag: string) => noteTags.find(item => item.value === tag)?.color ?? "slate";

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
            <div className="assistant-note-actions"><Button type="button" variant="outline" size="sm" onClick={() => { setIsCreatingNote(true); setNoteSearch(""); setNote({ title: "Nota sin título", content: "", tag: "general", tagColor: "slate", isPinned: false }); setPreviewNote(false); }}><Plus className="mr-1 size-3.5" />Nueva</Button><Button type="button" size="sm" onClick={() => note.id ? saveNote.mutate({ id: note.id, title: note.title, content: note.content, tag: note.tag }) : createNote.mutate({ title: note.title, content: note.content, tag: note.tag })} disabled={saveNote.isPending || createNote.isPending || !note.title.trim()}><Save className="mr-1 size-3.5" />Guardar</Button></div>
            <Input value={note.title} onChange={event => setNote(current => ({ ...current, title: event.target.value }))} maxLength={180} placeholder="Título de la nota" aria-label="Título de la nota" />
            <div className="assistant-note-meta"><label>Etiqueta<select value={note.tag} onChange={event => { const tag = event.target.value as NoteTag; setNote(current => ({ ...current, tag, tagColor: tagColor(tag) })); }} aria-label="Etiqueta de la nota">{noteTags.map(tag => <option value={tag.value} key={tag.value}>{tag.label}</option>)}</select></label></div>
            <div className="assistant-note-tabs"><button type="button" className={!previewNote ? "active" : ""} onClick={() => setPreviewNote(false)}>Editar</button><button type="button" className={previewNote ? "active" : ""} onClick={() => setPreviewNote(true)}><Eye className="mr-1 inline size-3.5" />Vista previa</button></div>
            <div className="assistant-attachment-toolbar"><Button type="button" variant="outline" size="sm" onClick={() => attachmentInputRef.current?.click()} disabled={!note.id || uploadAttachment.isPending}><Paperclip className="mr-1 size-3.5" />Adjuntar</Button><span>JPG, PNG o PDF · máximo 10 MB</span><input ref={attachmentInputRef} type="file" accept="image/jpeg,image/png,application/pdf" multiple hidden onChange={handleAttachmentSelection} /></div>
            {noteAttachments.length > 0 && <div className="assistant-attachment-list">{noteAttachments.map(attachment => <div key={attachment.id} className="assistant-attachment-row"><a href={attachment.fileUrl} target="_blank" rel="noreferrer"><FileText className="size-3.5" />{attachment.fileName}<span className="assistant-attachment-id">ID {attachment.id}</span></a><button type="button" title="Eliminar adjunto" aria-label={`Eliminar ${attachment.fileName}`} onClick={() => removeAttachment.mutate({ id: attachment.id })}><X className="size-3.5" /></button></div>)}</div>}
            {previewNote ? <div className="assistant-note-preview prose prose-sm max-w-none"><Streamdown>{note.content || "Escribe una nota para verla aquí."}</Streamdown></div> : <Textarea value={note.content} onChange={event => setNote(current => ({ ...current, content: event.target.value }))} maxLength={20000} placeholder="Escribe tus ideas y apuntes aquí…" className="min-h-28 resize-y" aria-label="Contenido de la nota" />}
            <div className="assistant-note-list-toolbar"><label className="assistant-note-search"><Search className="size-3.5" /><Input value={noteSearch} onChange={event => setNoteSearch(event.target.value)} placeholder="Buscar notas…" aria-label="Buscar notas por texto" /></label><select value={noteListFilter} onChange={event => setNoteListFilter(event.target.value as NoteTag | "all")} aria-label="Filtrar notas por etiqueta"><option value="all">Todas las etiquetas</option>{noteTags.map(tag => <option value={tag.value} key={tag.value}>{tag.label}</option>)}</select></div>
            <div className="assistant-note-list">{visibleNotes.length === 0 ? <p className="assistant-note-empty">No hay notas que coincidan con la búsqueda o etiqueta seleccionada.</p> : visibleNotes.map(item => <div className={`assistant-note-row ${note.id === item.id ? "selected" : ""}`} key={item.id}><button type="button" className="assistant-note-main" onClick={() => selectNote({ id: item.id, title: item.title, content: item.content, tag: (item.tag as NoteTag) || "general", tagColor: tagColor(item.tag), isPinned: Boolean(item.isPinned) })}><span>{item.isPinned && <Pin className="mr-1 inline size-3" aria-label="Nota fijada" />}{item.title}</span><small><b className={`note-tag note-tag-${tagColor(item.tag)}`}>{tagLabel(item.tag)}</b> · {new Date(item.updatedAt).toLocaleDateString("es-MX")}</small></button><div className="assistant-note-icon-actions"><button type="button" title="Visualizar nota" aria-label={`Visualizar ${item.title}`} onClick={() => { selectNote({ id: item.id, title: item.title, content: item.content, tag: (item.tag as NoteTag) || "general", tagColor: tagColor(item.tag), isPinned: Boolean(item.isPinned) }); setPreviewNote(true); }}><Eye className="size-3.5" /></button><button type="button" title={item.isPinned ? "Quitar prioridad" : "Fijar nota"} aria-label={item.isPinned ? `Quitar prioridad de ${item.title}` : `Fijar ${item.title}`} onClick={() => togglePinned.mutate({ id: item.id, isPinned: !item.isPinned })}>{item.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button><button type="button" title="Editar nota" aria-label={`Editar ${item.title}`} onClick={() => { selectNote({ id: item.id, title: item.title, content: item.content, tag: (item.tag as NoteTag) || "general", tagColor: tagColor(item.tag), isPinned: Boolean(item.isPinned) }); setPreviewNote(false); }}><Edit3 className="size-3.5" /></button><button type="button" title="Archivar nota" aria-label={`Archivar ${item.title}`} onClick={() => archiveNote.mutate({ id: item.id, archived: true })}><Archive className="size-3.5" /></button><button type="button" title="Eliminar nota" aria-label={`Eliminar ${item.title}`} onClick={() => removeNote.mutate({ id: item.id })}><Trash2 className="size-3.5" /></button></div></div>)}</div>
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
