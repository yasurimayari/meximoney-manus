import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  statement: "Extracto", invoice: "Factura", contract: "Contrato", policy: "Póliza", tax: "Fiscal", receipt: "Comprobante", other: "Otro",
};

export function DocumentOcrReview({ proposal, onComplete }: { proposal: any; onComplete: () => void }) {
  const extraction = proposal.extraction ?? {};
  const [name, setName] = useState(extraction.suggestedName || "");
  const [type, setType] = useState(extraction.suggestedType || "receipt");
  const [issuedOn, setIssuedOn] = useState(extraction.issuedOn || "");
  const [notes, setNotes] = useState(extraction.summary || "");
  const review = trpc.finance.documents.ocr.review.useMutation({ onError: error => toast.error(error.message) });
  const apply = () => review.mutate({ id: proposal.id, action: "apply", name: name || null, type: type as any, issuedAt: issuedOn ? new Date(`${issuedOn}T12:00:00`).getTime() : null, notes: notes || null }, { onSuccess: () => { toast.success("Propuesta OCR revisada y aplicada al documento"); onComplete(); } });
  const discard = () => review.mutate({ id: proposal.id, action: "discard" }, { onSuccess: () => { toast.success("Propuesta OCR descartada; el documento no cambió"); onComplete(); } });
  const fieldCount = Array.isArray(extraction.fields) ? extraction.fields.length : 0;

  return <section className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4" aria-label="Revisión de propuesta OCR">
    <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-4" /></span><div><h3 className="text-sm font-semibold">Propuesta OCR — revisar antes de aplicar</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Nada se guarda en movimientos, pagos ni fiscalidad. Sólo podrás actualizar este documento después de revisar cada dato.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="form-field sm:col-span-2"><Label>Nombre propuesto</Label><Input value={name} onChange={event => setName(event.target.value)} placeholder="Sin dato legible" /></label><label className="form-field"><Label>Tipo propuesto</Label><select value={type} onChange={event => setType(event.target.value)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-field"><Label>Fecha de emisión</Label><Input type="date" value={issuedOn} onChange={event => setIssuedOn(event.target.value)} /></label><label className="form-field sm:col-span-2"><Label>Resumen editable</Label><Textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={3000} placeholder="Sin resumen extraído" /></label></div>
    <div className="mt-3 grid gap-2 rounded-lg border bg-background/70 p-3 text-xs sm:grid-cols-2"><p><strong>Confianza:</strong> {extraction.confidence === "high" ? "Alta" : extraction.confidence === "medium" ? "Media" : "Baja"}</p><p><strong>Campos detectados:</strong> {fieldCount}</p>{extraction.issuer ? <p><strong>Emisor:</strong> {extraction.issuer}</p> : null}{extraction.documentNumber ? <p><strong>Folio:</strong> {extraction.documentNumber}</p> : null}{extraction.totalCents != null ? <p><strong>Total detectado:</strong> {new Intl.NumberFormat("es-MX", { style: "currency", currency: extraction.currency || "MXN" }).format(extraction.totalCents / 100)}</p> : null}{extraction.reference ? <p><strong>Referencia:</strong> {extraction.reference}</p> : null}</div>
    {extraction.warnings?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">{extraction.warnings.map((warning: string, index: number) => <li key={index}>{warning}</li>)}</ul> : null}
    <div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={discard} disabled={review.isPending}><X className="size-4" />Descartar propuesta</Button><Button type="button" onClick={apply} disabled={review.isPending || !name.trim()}><Check className="size-4" />{review.isPending ? "Aplicando…" : "Aplicar al documento"}</Button></div>
  </section>;
}
