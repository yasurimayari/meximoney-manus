import { z } from "zod";
import { invokeLLM, type FileContent, type ImageContent } from "./_core/llm";

export const OCR_PROVIDER = "gemini-3-flash-preview";

const nullableText = z.string().max(1000).nullable();

export const documentOcrExtractionSchema = z.object({
  suggestedName: nullableText,
  suggestedType: z.enum(["statement", "invoice", "contract", "policy", "tax", "receipt", "other"]).nullable(),
  issuer: nullableText,
  documentNumber: nullableText,
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  totalCents: z.number().int().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  taxIdentifier: nullableText,
  reference: nullableText,
  summary: z.string().max(3000).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string().max(500)).max(8),
  fields: z.array(z.object({
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(500),
    confidence: z.enum(["high", "medium", "low"]),
  })).max(16),
});

export type DocumentOcrExtraction = z.infer<typeof documentOcrExtractionSchema>;

function contentFromResult(result: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = result.choices[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((part): part is { type: "text"; text: string } => part.type === "text").map(part => part.text).join("\n");
  return "";
}

function parseJsonObject(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch { /* Try to rescue a valid object from incidental text. */ }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
  throw new Error("OCR returned no JSON object");
}

export async function extractDocumentOcr(input: { signedUrl: string; mimeType: "application/pdf" | "image/jpeg" | "image/png"; fileName: string }) {
  const sourcePart: ImageContent | FileContent = input.mimeType === "application/pdf"
    ? { type: "file_url", file_url: { url: input.signedUrl, mime_type: "application/pdf" } }
    : { type: "image_url", image_url: { url: input.signedUrl, detail: "high" } };

  const result = await invokeLLM({
    model: OCR_PROVIDER,
    maxTokens: 1100,
    requestTimeoutMs: 70_000,
    maxRetries: 1,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Eres un extractor OCR prudente de comprobantes financieros. Devuelve exclusivamente un objeto JSON. No inventes datos: usa null cuando no sea legible, una confianza baja cuando haya duda y advertencias claras. Convierte importes a centavos enteros. Las fechas deben usar YYYY-MM-DD. La salida debe incluir exactamente: suggestedName, suggestedType, issuer, documentNumber, issuedOn, dueOn, totalCents, currency, taxIdentifier, reference, summary, confidence, warnings, fields. fields es una lista de {label, value, confidence}. Nunca sugieras ni ejecutes crear movimientos, pagos, impuestos o registros fiscales.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Extrae únicamente lo que sea visible del archivo «${input.fileName}». Esta propuesta será revisada manualmente antes de aplicarse.` },
          sourcePart,
        ],
      },
    ],
  });

  return documentOcrExtractionSchema.parse(parseJsonObject(contentFromResult(result)));
}
