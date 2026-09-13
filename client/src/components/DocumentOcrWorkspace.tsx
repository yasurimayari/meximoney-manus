import { DocumentOcrReview } from "@/components/DocumentOcrReview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileSearch, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const typeOptions = [
  ["receipt", "Comprobante"], ["invoice", "Factura"], ["statement", "Extracto"], ["tax", "Fiscal"], ["other", "Otro"],
] as const;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",", 2)[1] || "") : reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export function DocumentOcrWorkspace({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof typeOptions)[number][0]>("receipt");
  const [scope, setScope] = useState<"personal" | "business" | "mixed">("personal");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<any>(null);
  const utils = trpc.useUtils();
  const analyze = trpc.finance.documents.ocr.analyze.useMutation({ onError: issue => { setError(issue.message); toast.error(issue.message); } });
  const save = trpc.finance.documents.save.useMutation({
    onError: issue => { setError(issue.message); toast.error(issue.message); },
    onSuccess: result => analyze.mutate({ documentId: result.id }, { onSuccess: output => setProposal(output) }),
  });

  useEffect(() => {
    if (!open) { setFile(null); setName(""); setType("receipt"); setScope("personal"); setNotes(""); setError(""); setProposal(null); }
  }, [open]);

  const select = (next: File | null) => {
    setError(""); setProposal(null);
    if (!next) { setFile(null); return; }
    if (!allowedTypes.has(next.type)) { setFile(null); setError("Selecciona un archivo JPG, PNG o PDF."); return; }
    if (next.size > 10 * 1024 * 1024) { setFile(null); setError("El archivo supera el límite de 10 MB."); return; }
    setFile(next); if (!name) setName(next.name.replace(/\.(pdf|png|jpe?g)$/i, ""));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) { setError("Adjunta un archivo JPG, PNG o PDF antes de analizar."); return; }
    try {
      const base64 = await readFile(file);
      save.mutate({ name: name.trim(), type, documentClass: "general", scope, relatedEntityType: "none", referenceProvider: "other", entityId: null, projectId: null, relatedEntityId: null, jurisdiction: null, referenceUrl: null, issuedAt: null, expiresAt: null, reminderAt: null, verified: false, notes: notes.trim() || null, fileUpload: { fileName: file.name, mimeType: file.type, base64 } });
    } catch (issue) { setError(issue instanceof Error ? issue.message : "No se pudo preparar el archivo."); }
  };
  const pending = save.isPending || analyze.isPending;
  const closeAfterReview = () => { void utils.finance.dashboard.invalidate(); onDone(); onOpenChange(false); };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Analizar comprobante con OCR</DialogTitle></DialogHeader>{proposal ? <DocumentOcrReview proposal={proposal} onComplete={closeAfterReview} /> : <form className="form-grid py-2" onSubmit={event => void submit(event)}><div className="col-span-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm"><div className="flex items-start gap-3"><FileSearch className="mt-0.5 size-5 shrink-0 text-primary"/><div><strong className="block">Propuesta para revisión humana</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">El análisis puede sugerir datos del comprobante. Tú los revisas y decides si se aplican sólo a este documento. No crea movimientos, pagos, impuestos ni conciliaciones.</p></div></div></div><label className="form-field col-span-2"><Label>Archivo privado</Label><Input required type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={event => select(event.target.files?.[0] || null)} />{file ? <span className="mt-1 text-xs text-emerald-700">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span> : null}{error ? <span className="mt-1 text-xs text-destructive">{error}</span> : null}</label><label className="form-field col-span-2"><Label>Nombre del documento</Label><Input required value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Ticket de supermercado" /></label><label className="form-field"><Label>Tipo</Label><select value={type} onChange={event => setType(event.target.value as typeof type)}>{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field"><Label>Área</Label><select value={scope} onChange={event => setScope(event.target.value as typeof scope)}><option value="personal">Personal</option><option value="business">Empresarial</option><option value="mixed">Mixto</option></select></label><label className="form-field col-span-2"><Label>Nota opcional</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={3000} placeholder="Contexto que quieres conservar con el documento" /></label><div className="form-actions col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending || !file || !name.trim()}><Upload className="size-4" />{save.isPending ? "Guardando…" : analyze.isPending ? "Extrayendo…" : "Guardar y analizar"}</Button></div></form>}</DialogContent></Dialog>;
}
