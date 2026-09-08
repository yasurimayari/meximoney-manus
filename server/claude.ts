const CLAUDE_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_VERSION = "2023-06-01";
export const MEXI_CLAUDE_MODEL = "claude-sonnet-4-5";

type ClaudeTextBlock = {
  type: "text";
  text: string;
};

type ClaudeInputContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export type ClaudeAttachment = { fileName: string; mimeType: "image/jpeg" | "image/png" | "application/pdf"; base64: string };

type ClaudeMessagesResponse = {
  content?: ClaudeTextBlock[];
};

export type MexiAnalysis = {
  answer: string;
  facts: Array<{ label: string; value: string; source: string; date?: string }>;
  calculations: Array<{ name: string; formula: string; substitution: string; result: string; source: string }>;
  assumptions: string[];
  recommendations: Array<{ title: string; rationale: string; priority: "alta" | "media" | "baja"; nextStep: string }>;
  warnings: string[];
  sources: Array<{ label: string; type: "internal" | "user" | "external"; detail: string }>;
  canExecute: false;
};

export class ClaudeRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeRequestError";
  }
}

function extractText(payload: ClaudeMessagesResponse) {
  const content = payload.content
    ?.filter((block): block is ClaudeTextBlock => block.type === "text" && typeof block.text === "string")
    .map(block => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
  if (!content) throw new ClaudeRequestError("Claude no devolvió texto utilizable.");
  return content;
}

function parseAnalysis(content: string): MexiAnalysis {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const source = (fenced ?? content).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? source.slice(start, end + 1) : source;
  let parsed: Partial<MexiAnalysis>;
  try {
    parsed = JSON.parse(candidate) as Partial<MexiAnalysis>;
  } catch {
    throw new ClaudeRequestError("Claude no devolvió una respuesta estructurada válida.");
  }

  if (typeof parsed.answer !== "string" || !parsed.answer.trim()) throw new ClaudeRequestError("La respuesta de Mexi no contiene un análisis válido.");
  const facts = Array.isArray(parsed.facts) ? parsed.facts.filter(item => item && typeof item === "object" && typeof item.label === "string" && typeof item.value === "string" && typeof item.source === "string") as MexiAnalysis["facts"] : [];
  const calculations = Array.isArray(parsed.calculations) ? parsed.calculations.filter(item => item && typeof item === "object" && typeof item.name === "string" && typeof item.formula === "string" && typeof item.substitution === "string" && typeof item.result === "string" && typeof item.source === "string") as MexiAnalysis["calculations"] : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(item => item && typeof item === "object" && typeof item.title === "string" && typeof item.rationale === "string" && typeof item.nextStep === "string" && ["alta", "media", "baja"].includes(item.priority as string)) as MexiAnalysis["recommendations"] : [];
  const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(item => item && typeof item === "object" && typeof item.label === "string" && typeof item.detail === "string" && ["internal", "user", "external"].includes(item.type as string)) as MexiAnalysis["sources"] : [];
  const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions.filter(item => typeof item === "string") : [];
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter(item => typeof item === "string") : [];
  return { answer: parsed.answer.trim(), facts, calculations, assumptions, recommendations, warnings, sources, canExecute: false };
}

export function formatMexiAnalysis(analysis: MexiAnalysis) {
  const section = (title: string, rows: string[]) => rows.length ? `\n\n### ${title}\n${rows.join("\n")}` : "";
  return [
    analysis.answer.trim(),
    section("Datos utilizados", analysis.facts.map(item => `- **${item.label}:** ${item.value} _(fuente: ${item.source}${item.date ? `; ${item.date}` : ""})_`)),
    section("Cálculos visibles", analysis.calculations.map(item => `- **${item.name}:**\n  - Fórmula: \`${item.formula}\`\n  - Sustitución: \`${item.substitution}\`\n  - Resultado: **${item.result}**\n  - Fuente: ${item.source}`)),
    section("Supuestos", analysis.assumptions.map(item => `- ${item}`)),
    section("Recomendaciones (sin ejecutar)", analysis.recommendations.map(item => `- **${item.title}** · prioridad ${item.priority}\n  - ${item.rationale}\n  - Próximo paso manual: ${item.nextStep}`)),
    section("Advertencias", analysis.warnings.map(item => `- ${item}`)),
    section("Fuentes", analysis.sources.map(item => `- **${item.label}** (${item.type}): ${item.detail}`)),
    "\n\n> Mexi IA solo analiza tus registros. No ejecuta pagos, transferencias, inversiones, compras, eliminaciones ni cambios de datos.",
  ].filter(Boolean).join("");
}

async function callClaude(input: { system: string; prompt: string; maxTokens?: number; attachments?: ClaudeAttachment[] }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ClaudeRequestError("La clave de Claude no está configurada en el servidor.");

  const body = JSON.stringify({
    model: MEXI_CLAUDE_MODEL,
    max_tokens: input.maxTokens ?? 1_800,
    system: input.system,
    messages: [{ role: "user", content: input.attachments?.length ? [{ type: "text", text: input.prompt }, ...input.attachments.map(attachment => attachment.mimeType === "application/pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.base64 } } : { type: "image", source: { type: "base64", media_type: attachment.mimeType, data: attachment.base64 } })] as ClaudeInputContent[] : input.prompt }],
  });
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(CLAUDE_MESSAGES_URL, { method: "POST", headers: { "content-type": "application/json", "anthropic-version": CLAUDE_VERSION, "x-api-key": apiKey }, signal: AbortSignal.timeout(75_000), body });
    } catch (error) {
      if (attempt === 1) throw new ClaudeRequestError("Claude no respondió dentro del tiempo esperado.");
    }
    if (response?.ok) break;
    const status = response?.status ?? 0;
    if (attempt === 0 && (status === 408 || status === 429 || status >= 500)) { await new Promise(resolve => setTimeout(resolve, 700)); continue; }
    throw new ClaudeRequestError(status ? `Claude respondió con estado ${status}.` : "Claude no respondió dentro del tiempo esperado.");
  }
  if (!response?.ok) throw new ClaudeRequestError("Claude no pudo completar el análisis.");
  return extractText(await response.json() as ClaudeMessagesResponse);
}

export async function askClaudeForMexi(input: { system: string; prompt: string }) {
  return callClaude(input);
}

export async function askClaudeForMexiAnalysis(input: { system: string; prompt: string; attachments?: ClaudeAttachment[] }) {
  const content = await callClaude({
    ...input,
    system: `${input.system}\n\nDevuelve exclusivamente un objeto JSON válido, sin markdown ni texto adicional, con esta forma exacta:\n{"answer":"string","facts":[{"label":"string","value":"string","source":"string","date":"string opcional"}],"calculations":[{"name":"string","formula":"string","substitution":"string","result":"string","source":"string"}],"assumptions":["string"],"recommendations":[{"title":"string","rationale":"string","priority":"alta|media|baja","nextStep":"string"}],"warnings":["string"],"sources":[{"label":"string","type":"internal|user|external","detail":"string"}],"canExecute":false}. No incluyas propiedades adicionales.\n\nReglas: solo usa datos suministrados; no inventes cifras; toda recomendación debe ser manual; muestra la fórmula cuando calcules; si faltan datos, dilo en warnings o assumptions; canExecute debe ser false.`,
  });
  return parseAnalysis(content);
}
