import { invokeLLM, listLLMModels } from "./_core/llm";

export type QuickCaptureDraft = {
  type: "income" | "expense" | "unknown";
  amountCents: number | null;
  currency: string | null;
  occurredOn: string | null;
  scope: "personal" | "business" | "mixed" | "unknown";
  notes: string;
  confidence: number;
  needsReview: string[];
};

const draftSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["income", "expense", "unknown"] },
    amountCents: { type: ["integer", "null"], minimum: 0 },
    currency: { type: ["string", "null"], minLength: 3, maxLength: 3 },
    occurredOn: { type: ["string", "null"] },
    scope: { type: "string", enum: ["personal", "business", "mixed", "unknown"] },
    notes: { type: "string", maxLength: 500 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    needsReview: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
  required: ["type", "amountCents", "currency", "occurredOn", "scope", "notes", "confidence", "needsReview"],
  additionalProperties: false,
} as const;

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

export function parseQuickCaptureDraft(content: string): QuickCaptureDraft {
  const raw = JSON.parse(content) as Record<string, unknown>;
  const type = raw.type === "income" || raw.type === "expense" ? raw.type : "unknown";
  const scope = raw.scope === "personal" || raw.scope === "business" || raw.scope === "mixed" ? raw.scope : "unknown";
  const amountCents = typeof raw.amountCents === "number" && Number.isInteger(raw.amountCents) && raw.amountCents > 0 ? raw.amountCents : null;
  const rawCurrency = typeof raw.currency === "string" ? raw.currency.trim().toUpperCase() : "";
  const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : null;
  const occurredOn = isDateOnly(raw.occurredOn) ? raw.occurredOn : null;
  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 500) : "";
  const confidence = typeof raw.confidence === "number" && Number.isFinite(raw.confidence) ? Math.min(100, Math.max(0, Math.round(raw.confidence))) : 0;
  const needsReview = Array.isArray(raw.needsReview) ? raw.needsReview.filter((item): item is string => typeof item === "string").map(item => item.slice(0, 160)).slice(0, 8) : [];
  return { type, amountCents, currency, occurredOn, scope, notes, confidence, needsReview };
}

export async function extractQuickCaptureDraft(text: string, defaultCurrency: string): Promise<QuickCaptureDraft> {
  const models = await listLLMModels();
  const model = models.data.find(item => item.id === "gpt-5-mini")?.id ?? models.data.find(item => item.id === "gpt-5-nano")?.id ?? models.data[0]?.id;
  const response = await invokeLLM({
    model,
    maxTokens: 700,
    messages: [
      { role: "system", content: `Eres un extractor conservador de borradores de movimientos financieros manuales. Extrae sólo información explícita del texto. No inventes una fecha, moneda, importe, tipo, ámbito, cuenta, categoría ni contacto. Convierte importes explícitos a centavos enteros. Si la fecha sólo dice hoy, usa la fecha actual ${new Date().toISOString().slice(0, 10)}; si es ambigua, usa null y añade una revisión. La moneda predeterminada es ${defaultCurrency.toUpperCase()}, pero úsala sólo si el texto no indica otra moneda y el importe es explícito. El resultado es un borrador: nunca ordenes guardar, transferir, pagar ni conectar una cuenta.` },
      { role: "user", content: text },
    ],
    response_format: { type: "json_schema", json_schema: { name: "quick_capture_draft", strict: true, schema: draftSchema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("No fue posible interpretar el texto. Completa el movimiento manualmente.");
  return parseQuickCaptureDraft(content);
}
